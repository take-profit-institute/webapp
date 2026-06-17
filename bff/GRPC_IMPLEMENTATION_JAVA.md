# Java Spring Boot gRPC 구현 가이드 (Candle MSA)

이 문서는 `bff/MSA_GRPC_CONTRACT.md`에 정의된 gRPC 계약을 Java Spring Boot 환경에서 어떻게 구현하는지 상세한 예시와 함께 설명합니다. gRPC를 처음 접하는 팀원들이 표준화된 패턴으로 서비스를 개발할 수 있도록 돕는 것을 목적으로 합니다.

---

## 1. Proto 정의 (The Contract)

`bff/MSA_GRPC_CONTRACT.md`의 명세를 바탕으로, 프로젝트의 `src/main/proto` 경로에 서비스를 정의합니다.

**예시: `src/main/proto/candle/order/v1/order.proto`**

```proto
syntax = "proto3";

package candle.order.v1;

// Java 코드 생성을 위한 옵션
option java_multiple_files = true;
option java_package = "com.candle.order.v1";
option java_outer_classname = "OrderProto";

import "google/protobuf/timestamp.proto";

enum OrderSide {
  ORDER_SIDE_UNSPECIFIED = 0;
  ORDER_SIDE_BUY = 1;
  ORDER_SIDE_SELL = 2;
}

message Order {
  string id = 1;
  string user_id = 2;
  string symbol = 3;
  OrderSide side = 4;
  int64 quantity = 6;
  int64 price = 7;
  google.protobuf.Timestamp created_at = 13;
}

message PlaceOrderRequest {
  string user_id = 1;
  string symbol = 2;
  OrderSide side = 3;
  int64 quantity = 5;
  int64 price = 6;
  string idempotency_key = 7;
}

service OrderCommandService {
  rpc PlaceOrder(PlaceOrderRequest) returns (Order);
}
```

---

## 2. 도메인 모델 및 엔티티 (Internal Model)

gRPC 메시지 클래스는 전송용 객체(DTO)이므로, 비즈니스 로직과 영속성 계층에서는 별도의 도메인 모델이나 JPA 엔티티를 사용합니다.

```java
@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderEntity {
    @Id
    private String id;
    private String userId;
    private String symbol;
    
    @Enumerated(EnumType.STRING)
    private OrderSide side; // 내부용 Java Enum
    
    private Long quantity;
    private Long price; // 명세에 따라 int64(Long) 사용
    
    private LocalDateTime createdAt;

    @Builder
    public OrderEntity(String id, String userId, String symbol, OrderSide side, Long quantity, Long price) {
        this.id = id;
        this.userId = userId;
        this.symbol = symbol;
        this.side = side;
        this.quantity = quantity;
        this.price = price;
        this.createdAt = LocalDateTime.now();
    }
}
```

---

## 3. 서비스 로직 및 Outbox 패턴 (Business Logic)

명세 1.1절 및 6.1절에 따라 **도메인 정합성 검증, DB 트랜잭션, Outbox 기록**을 하나의 트랜잭션으로 묶습니다.

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public OrderEntity placeOrder(OrderCreateCommand command) {
        // 1. 멱등성 검증 (idempotency_key 확인)
        
        // 2. 비즈니스 규칙 검증 (잔고 확인 등)

        // 3. 주문 저장
        OrderEntity order = OrderEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(command.getUserId())
                .symbol(command.getSymbol())
                .side(command.getSide())
                .quantity(command.getQuantity())
                .price(command.getPrice())
                .build();
        orderRepository.save(order);

        // 4. Outbox 이벤트 기록 (명세 6.1)
        OrderPlacedEvent event = new OrderPlacedEvent(order);
        OutboxEntity outbox = OutboxEntity.builder()
                .aggregateType("ORDER")
                .aggregateId(order.getId())
                .eventType("OrderPlaced")
                .payload(objectMapper.valueToTree(event))
                .occurredAt(LocalDateTime.now())
                .build();
        outboxRepository.save(outbox);

        return order;
    }
}
```

---

## 4. gRPC 서비스 계층 (DTO Mapping & Exception)

`@GrpcService`를 사용하여 외부 요청을 받고, 결과를 gRPC 전송용 객체로 변환하여 응답합니다.

```java
@GrpcService
@RequiredArgsConstructor
public class OrderGrpcService extends OrderCommandServiceGrpc.OrderCommandServiceImplBase {

    private final OrderService orderService;
    private final OrderMapper orderMapper; // MapStruct 사용 권장

    @Override
    public void placeOrder(PlaceOrderRequest request, StreamObserver<Order> responseObserver) {
        try {
            // 1. Proto Request -> Domain Command 변환
            OrderCreateCommand command = orderMapper.toCommand(request);

            // 2. 비즈니스 로직 실행
            OrderEntity result = orderService.placeOrder(command);

            // 3. Domain Entity -> Proto Response DTO 변환
            Order response = orderMapper.toProto(result);

            // 4. 응답 전송
            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (DomainException e) {
            // 명세 2.3 에러 매핑: FAILED_PRECONDITION (409)
            responseObserver.onError(Status.FAILED_PRECONDITION
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        } catch (Exception e) {
            // 알 수 없는 에러: INTERNAL (500)
            responseObserver.onError(Status.INTERNAL
                    .withDescription("Internal server error")
                    .asRuntimeException());
        }
    }
}
```

---

## 5. MapStruct를 이용한 변환기 (Mapper)

빌더를 수동으로 호출하는 대신 MapStruct를 사용하여 안전하고 간결하게 변환합니다.

```java
@Mapper(componentModel = "spring")
public interface OrderMapper {

    // Request -> Command
    OrderCreateCommand toCommand(PlaceOrderRequest request);

    // Entity -> Proto DTO
    @Mapping(target = "id", source = "id")
    @Mapping(target = "createdAt", expression = "java(mapTimestamp(entity.getCreatedAt()))")
    Order toProto(OrderEntity entity);

    // LocalDateTime -> google.protobuf.Timestamp 변환 (명세 2.2)
    default com.google.protobuf.Timestamp mapTimestamp(LocalDateTime dateTime) {
        if (dateTime == null) return null;
        Instant instant = dateTime.atZone(ZoneId.of("Asia/Seoul")).toInstant();
        return com.google.protobuf.Timestamp.newBuilder()
                .setSeconds(instant.getEpochSecond())
                .setNanos(instant.getNano())
                .build();
    }
}
```

---

## 💡 구현 핵심 체크리스트

1.  **데이터 타입 주의**:
    *   금액/수량에 `double` 또는 `float` 사용 금지. 반드시 `int64`(Java `Long`)를 사용하세요.
2.  **에러 코드 준수**:
    *   `bff/MSA_GRPC_CONTRACT.md` 2.3절의 에러 매핑 표를 확인하여 적절한 `Status` 코드를 반환하세요.
3.  **메타데이터 활용**:
    *   BFF가 보내는 `x-user-id`, `x-request-id`는 인터셉터를 통해 로깅 및 보안 검증에 활용하세요.
4.  **트랜잭션 원자성**:
    *   도메인 상태 변경과 Outbox 이벤트 저장은 반드시 하나의 DB 트랜잭션 내에서 이루어져야 합니다.
5.  **멱등성 처리**:
    *   `idempotency_key`를 사용하여 중복 명령 시 안전하게 이전 결과를 반환하거나 에러를 처리하세요.
