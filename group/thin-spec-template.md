# Template — Thin SPEC Cuối Day 05

Thin SPEC không phải PRD đầy đủ. Đây là bản cam kết đủ rõ để sáng Day 06 nhóm build ngay.

## 1. Track, product/app và user

**Track:**  Travel & Hospitality
**Product/app thật:**  Lập lịch trình tham quan khám phá VinWonders (Vinpearl & Safari)
**User cụ thể:**  Khách đi VinWonders, đặc biệt là nhóm gia đình có trẻ em và người lớn tuổi, muốn có lịch trình cá nhân hóa theo mốc giờ để tối ưu trải nghiệm trong công viên.
**Nhóm có phải user thật không? Nếu không, khác ở đâu?**  Nhóm này là user thật, dựa trên nhu cầu phổ biến của khách tham quan VinWonders. Tuy nhiên, trong prototype, chúng ta sẽ giả định thông tin đầu vào để tập trung vào việc tạo lịch trình cá nhân hóa, thay vì thu thập dữ liệu thực tế từ user.

## 2. Evidence summary

| Evidence | Nguồn | User/pain nói lên điều gì? | SPEC phải đổi gì? |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## 3. Pain statement

```text
Khách hàng đi VinWonders thường gặp khó khăn trong việc lên lịch trình tham quan cá nhân hóa, đặc biệt là khi đi cùng nhóm gia đình có trẻ em và người lớn tuổi. Họ phải tự tìm hiểu và sắp xếp các hoạt động phù hợp với sở thích và giới hạn của từng thành viên, dẫn đến mất thời gian và trải nghiệm không tối ưu. Bằng chứng chính là nhiều review trên các trang du lịch phàn nàn về việc khó khăn trong việc lên kế hoạch tham quan hiệu quả tại VinWonders.
```

## 4. Build slice

```text
Cho khách hàng đang [lên lịch trình tham quan tại VinWonders Phú Quốc cùng nhóm gia đình có trẻ em và người lớn tuổi],

prototype sẽ dùng AI để [tự động phân tích thông tin đầu vào (thời gian, thành viên, sở thích) và sắp xếp các hoạt động phù hợp vào các mốc giờ cố định],

tạo ra [bản lịch trình tham quan cá nhân hóa chi tiết theo từng mốc giờ (bao gồm khu vui chơi, show diễn, điểm ăn uống, thời gian nghỉ và lý do gợi ý)],

và xử lý [nguy cơ AI gợi ý sai hoạt động không phù hợp với độ tuổi, chiều cao hoặc sức khỏe của trẻ em/người lớn tuổi làm vỡ lịch trình] bằng [cơ chế bộ lọc ràng buộc (constraint filter), hỏi xác nhận lại thông tin (ask again), gắn nhãn cảnh báo điều kiện (warning label) và cung cấp tính năng đổi nhanh hoạt động không phù hợp].
```

## 5. Auto/Aug decision

Chọn một:

- [ ] **Augmentation:** AI gợi ý/draft/phân loại, user quyết cuối.
- [ ] **Conditional automation:** AI tự làm trong case hẹp; case mơ hồ/rủi ro chuyển người.
- [ ] **Automation:** AI tự quyết và tự hành động.

**Lý do chọn:**  
**Human role:** reviewer / decider / trainer / rescuer / none  

Thay **phần 7** bằng đoạn dưới. Cấu trúc vẫn theo template Thin SPEC. 

## 6. Four paths

| Path           | Prototype phải thể hiện gì?                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Happy          | User nhập đủ thông tin. AI tạo lịch trình cá nhân hóa trong VinWonders Phú Quốc theo mốc giờ, gồm khu vui chơi, show, điểm ăn uống, thời gian nghỉ và lý do gợi ý. |
| Low-confidence | User nhập thiếu dữ liệu. AI không tạo lịch trình ngay, mà hỏi lại thời gian vào/ra, nhóm đi cùng, sở thích và giới hạn sức khỏe/độ tuổi.                           |
| Failure        | AI gợi ý hoạt động không phù hợp. Prototype phải đánh dấu hoạt động cần kiểm tra điều kiện và cho user thay thế nhanh.                                             |
| Correction     | User sửa lịch trình. AI cập nhật lại toàn bộ lịch trình trong VinWonders Phú Quốc và giữ ràng buộc mới trong phiên hiện tại.                                       |

### 6.1. Happy path

```mermaid
flowchart TD
    A[User nhập đủ thông tin: đi VinWonders Phú Quốc từ 9h-20h, 2 người lớn + 1 trẻ 8 tuổi, thích show, thủy cung, trò nhẹ] --> B[AI nhận diện task: tạo lịch trình trong VinWonders Phú Quốc]
    B --> C[AI lọc hoạt động phù hợp với nhóm gia đình]
    C --> D[AI khóa các mốc giờ show và hoạt động cố định]
    D --> E[AI sắp xếp thứ tự khu vui chơi, điểm ăn uống, thời gian nghỉ]
    E --> F[AI tạo lịch trình theo từng mốc giờ trong VinWonders Phú Quốc]
    F --> G[User xem lịch trình và chọn dùng]
```

### 6.2. Low-confidence path

```mermaid
flowchart TD
    A[User nhập thiếu: Lên lịch trình VinWonders Phú Quốc cho tôi] --> B[AI phát hiện thiếu dữ liệu quan trọng]
    B --> C{Đủ dữ liệu để tạo lịch trình chưa?}
    C -->|Chưa đủ| D[AI hỏi lại]
    D --> E[User vào công viên lúc mấy giờ?]
    D --> F[User rời công viên lúc mấy giờ?]
    D --> G[User đi cùng ai: một mình, nhóm bạn, gia đình có trẻ em, người lớn tuổi?]
    D --> H[User thích show, trò nhẹ, thủy cung hay trò cảm giác mạnh?]
    E --> I[User bổ sung thông tin]
    F --> I
    G --> I
    H --> I
    I --> J[AI tạo lịch trình cá nhân hóa trong VinWonders Phú Quốc]
```

### 6.3. Failure path

```mermaid
flowchart TD
    A[AI tạo lịch trình VinWonders Phú Quốc] --> B[AI gợi ý hoạt động không phù hợp]
    B --> C[Ví dụ: gợi ý trò cảm giác mạnh cho gia đình có trẻ nhỏ hoặc người lớn tuổi]
    C --> D[Prototype đánh dấu hoạt động cần kiểm tra điều kiện]
    D --> E[User chọn Không phù hợp]
    E --> F[AI loại hoạt động sai khỏi lịch trình]
    F --> G[AI thay bằng hoạt động nhẹ hơn hoặc show phù hợp hơn]
    G --> H[AI cập nhật lại lịch trình trong VinWonders Phú Quốc]
```

### 6.4. Correction path

```mermaid
flowchart TD
    A[User sửa: Bỏ trò cảm giác mạnh, ưu tiên show và khu trong nhà] --> B[AI ghi nhận constraint mới trong phiên]
    B --> C[AI lọc lại hoạt động trong VinWonders Phú Quốc]
    C --> D[AI tính lại thứ tự di chuyển và thời gian nghỉ]
    D --> E[AI cập nhật lịch trình theo mốc giờ]
    E --> F[User xem lịch trình mới]
    F --> G[AI không tiếp tục gợi ý trò cảm giác mạnh trong phiên hiện tại]
```

## 7. Failure mode nguy hiểm nhất

```text
Nếu user đi VinWonders Phú Quốc cùng trẻ em, người lớn tuổi hoặc người có giới hạn sức khỏe,
AI có thể gợi ý hoạt động không phù hợp về độ tuổi, chiều cao, sức khỏe hoặc mức độ mạo hiểm,
hậu quả là user mất thời gian di chuyển đến khu không chơi được, lịch trình bị vỡ, trải nghiệm giảm, thậm chí có rủi ro an toàn.
Prototype sẽ xử lý bằng ask again + constraint filter + warning label:
- hỏi nhóm đi cùng trước khi tạo lịch trình,
- hỏi mức độ muốn chơi trò cảm giác mạnh,
- ưu tiên hoạt động phù hợp với trẻ em/người lớn tuổi nếu có,
- gắn nhãn "cần kiểm tra điều kiện" với trò có ràng buộc,
- cho phép user bấm "không phù hợp" để AI thay thế nhanh bằng hoạt động khác trong VinWonders Phú Quốc.
Owner kiểm thử path này là [Tên thành viên phụ trách test/failure path].
```

## 8. Owner plan cho sáng Day 06

| Thành viên | Việc phụ trách | Bằng chứng cần có trong repo |
|---|---|---|
|  | Research / evidence |  |
|  | SPEC |  |
|  | Prototype |  |
|  | Test / failure path |  |
|  | Demo script / repo |  |
