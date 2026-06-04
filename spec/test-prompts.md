# 1. Happy Path

## Description

User cung cấp đầy đủ thông tin cần thiết để tạo lịch trình tham quan cá nhân hóa trong VinWonders Phú Quốc, bao gồm:

* Ngày tham quan
* Thời gian trong công viên
* Nhóm khách
* Sở thích
* Các hoạt động không ưu tiên hoặc muốn tránh

### Expected Outcome (Chatbot)

* AI tạo lịch trình tham quan theo từng khung giờ rõ ràng.
* Lịch trình bao gồm:

  * Khu vui chơi đề xuất
  * Show biểu diễn phù hợp
  * Điểm ăn uống
  * Thời gian nghỉ ngơi
  * Lý do gợi ý cho từng lựa chọn
* Lộ trình được tối ưu để giảm thời gian di chuyển.
* AI đề xuất phương án dự phòng nếu không kịp thời gian hoặc có thay đổi.
* User có thể:

  * Chọn **"Tạo lịch trình này"** để xác nhận.
  * Hoặc chọn **"Điều chỉnh lịch trình"** để yêu cầu thay đổi.

---

## Prompt 1 – Gia đình có trẻ em

### Prompt Engineering Version

Tôi muốn lập lịch trình tham quan VinWonders Phú Quốc cho gia đình.

Thông tin:

* Ngày tham quan: 15/07/2026
* Thời gian trong công viên: 09:00–18:00
* Nhóm khách: 2 người lớn, 2 trẻ em (6 tuổi và 10 tuổi)

Sở thích:

* Ưu tiên các trò chơi phù hợp cả gia đình
* Ưu tiên khu vui chơi trẻ em
* Muốn xem các show biểu diễn nổi bật
* Muốn có thời gian nghỉ ngơi và ăn trưa thoải mái

Không ưu tiên:

* Trò chơi cảm giác mạnh

Yêu cầu:

* Gợi ý lịch trình theo từng khung giờ
* Sắp xếp lộ trình hợp lý để giảm đi bộ
* Cho biết hoạt động nào nên ưu tiên đặt lên đầu ngày
* Đề xuất phương án dự phòng nếu không kịp thời gian

### End-user Version

Tạo lịch trình tham quan VinWonders Phú Quốc từ 09:00 đến 18:00 cho gia đình 2 người lớn và 2 trẻ em (6 và 10 tuổi). Ưu tiên trò chơi gia đình, khu vui chơi trẻ em và các show biểu diễn; không quan tâm trò cảm giác mạnh. Hãy tối ưu để giảm thời gian đi bộ và có thời gian ăn trưa, nghỉ ngơi.

### Expected Outcome

* AI tạo lịch trình từ 09:00–18:00 theo từng mốc giờ.
* Ưu tiên các khu vui chơi dành cho gia đình và trẻ em vào đầu ngày.
* Chèn thời gian ăn trưa và nghỉ ngơi hợp lý.
* Đề xuất các show phù hợp với trẻ em.
* Tránh hoặc giảm thiểu các trò chơi cảm giác mạnh.
* Có phương án thay thế nếu bỏ lỡ một show hoặc hoạt động.

---

## Prompt 2 – Cặp đôi

### Prompt Engineering Version

Tôi và vợ sẽ đi VinWonders Phú Quốc ngày 05/09/2026 từ 09:00 đến 18:00.

Chúng tôi là cặp đôi, thích trải nghiệm nhẹ nhàng và đẹp để chụp ảnh.

Sở thích (theo mức ưu tiên):

1. Chụp ảnh và kiến trúc đẹp
2. Show biểu diễn văn hóa
3. Nhà hàng có không gian đẹp, lãng mạn
4. Tham quan nhẹ nhàng

Không thích:

* Trò chơi cảm giác mạnh

Yêu cầu:

* Xây dựng lịch trình theo từng khung giờ
* Ưu tiên trải nghiệm lãng mạn, không vội vàng
* Gợi ý địa điểm chụp ảnh đẹp nhất theo từng khu
* Đề xuất thời điểm ăn trưa phù hợp

### End-user Version

Tôi và vợ sẽ đi VinWonders Phú Quốc ngày 05/09/2026 từ 09:00 đến 18:00. Chúng tôi thích chụp ảnh, tham quan kiến trúc đẹp, xem các show văn hóa và ăn tại nhà hàng có không gian đẹp. Không thích trò cảm giác mạnh. Hãy xây dựng lịch trình phù hợp cho cặp đôi.

### Expected Outcome

* AI tạo lịch trình tham quan theo từng khung giờ.
* Ưu tiên các điểm check-in và khu vực có kiến trúc đẹp.
* Đề xuất thời gian chụp ảnh tối ưu theo ánh sáng trong ngày.
* Chèn các show văn hóa phù hợp với sở thích.
* Gợi ý nhà hàng có không gian đẹp cho bữa trưa.
* Tránh các hoạt động cảm giác mạnh và lịch trình quá dày đặc.
* Đảm bảo trải nghiệm thư giãn, lãng mạn và ít phải di chuyển qua lại.


# 2. Low-confidence Path

## Description

User cung cấp thông tin chưa đầy đủ để AI có thể tự tin tạo lịch trình tham quan cá nhân hóa trong VinWonders Phú Quốc.

Các thông tin còn thiếu có thể bao gồm:

* Ngày tham quan
* Thời gian vào công viên
* Thời gian rời công viên
* Nhóm khách tham gia
* Độ tuổi trẻ em (nếu có)
* Sở thích hoặc hoạt động muốn ưu tiên
* Các hoạt động muốn tránh

Trong trường hợp này, AI không được tự động tạo lịch trình hoàn chỉnh ngay lập tức mà cần thu thập thêm thông tin cần thiết.

### Expected Outcome (Chatbot)

* AI nhận diện dữ liệu còn thiếu.
* AI chủ động hỏi lại để làm rõ thông tin.
* AI có thể đưa ra các lựa chọn nhanh để người dùng trả lời.
* AI chưa tạo lịch trình chi tiết cho đến khi nhận đủ dữ liệu.
* Sau khi người dùng bổ sung thông tin (Reprompt), AI mới tiến hành tạo lịch trình.

### Required Clarification Questions

Trước khi lập lịch trình, chatbot bắt buộc phải xác nhận hoặc hỏi thêm các thông tin sau:

1. Ngày tham quan cụ thể
2. Thời gian vào công viên
3. Thời gian rời công viên
4. Nhóm đi cùng (số lượng người lớn, trẻ em)
5. Sở thích hoặc hoạt động muốn ưu tiên

---

## Prompt 1

### Initial Prompt

Bạn gợi ý lịch trình VinWonders Phú Quốc giúp mình nhé.

### Expected Chatbot Response

AI không tạo lịch trình ngay.

AI cần hỏi lại tối thiểu các thông tin sau:

* Bạn dự định đi ngày nào?
* Bạn sẽ vào công viên lúc mấy giờ và dự kiến ở lại đến khi nào?
* Nhóm của bạn gồm bao nhiêu người? Có trẻ em hoặc người lớn tuổi không?
* Bạn thích trải nghiệm nào nhất (show diễn, trò chơi, thủy cung, khu trẻ em, cảm giác mạnh...)?
* Có hoạt động nào bạn muốn tránh không?

Ví dụ:

> Mình có thể giúp bạn xây dựng lịch trình phù hợp hơn. Trước khi lập kế hoạch, bạn cho mình biết:
>
> * Ngày tham quan cụ thể
> * Thời gian dự kiến vào và rời công viên
> * Thành phần nhóm khách (người lớn, trẻ em, người cao tuổi...)
> * Các hoạt động muốn ưu tiên
> * Các hoạt động không muốn tham gia

### Reprompt

Mình muốn đi VinWonders Phú Quốc trong 1 ngày vào cuối tuần này (Chủ nhật 08/06/2026), dự kiến ở đó từ 9:00 đến 18:00. Nhóm mình có 2 người lớn và 1 bé 6 tuổi. Cả nhóm thích trải nghiệm nhẹ nhàng, xem show diễn, tham quan khu vui chơi và thủy cung, không chơi trò cảm giác mạnh. Mình muốn lịch trình có nhịp độ thoải mái, có nghỉ trưa khoảng 1–2 tiếng để ăn uống và nghỉ ngơi, ưu tiên các hoạt động phù hợp cho trẻ nhỏ.

### Expected Outcome

* AI xác nhận đã có đủ thông tin.
* AI tạo lịch trình tham quan từ 09:00–18:00.
* Ưu tiên thủy cung, show diễn và khu vui chơi phù hợp trẻ em.
* Chèn thời gian ăn trưa và nghỉ ngơi từ 1–2 tiếng.
* Tránh các hoạt động cảm giác mạnh.
* Tối ưu lộ trình để giảm thời gian di chuyển.

---

## Prompt 2

### Initial Prompt

Mình muốn đi VinWonders cuối tuần này.

### Expected Chatbot Response

AI không được giả định thông tin còn thiếu.

AI cần tiếp tục hỏi để làm rõ:

* Chính xác ngày nào trong cuối tuần?
* Bạn dự định ở công viên trong khoảng thời gian nào?
* Đi một mình, theo gia đình hay theo nhóm bạn?
* Có trẻ em hoặc người lớn tuổi đi cùng không?
* Bạn thích loại hoạt động nào?
* Có hoạt động nào muốn tránh không?

Ví dụ:

> Mình có thể giúp bạn lên lịch trình phù hợp. Bạn cho mình biết thêm:
>
> * Bạn đi vào thứ Bảy hay Chủ nhật?
> * Dự kiến vào và ra khỏi công viên lúc mấy giờ?
> * Nhóm của bạn gồm những ai?
> * Bạn muốn ưu tiên show diễn, khu vui chơi, thủy cung hay trò chơi cảm giác mạnh?
> * Bạn muốn lịch trình dày đặc hay thư giãn?

### Reprompt

Mình đi VinWonders Phú Quốc vào Chủ nhật 08/06/2026, từ 9:00 đến 18:00. Nhóm mình có 2 người lớn và 1 bé 6 tuổi. Cả nhóm thích các hoạt động nhẹ nhàng, xem show và tham quan là chính, không chơi trò cảm giác mạnh. Mình muốn lịch trình thoải mái, có nghỉ trưa khoảng 1–2 tiếng để ăn uống và nghỉ ngơi.

### Expected Outcome

* AI xác nhận đã nhận đủ dữ liệu.
* AI tạo lịch trình tham quan theo từng khung giờ.
* Ưu tiên trải nghiệm gia đình và trẻ em.
* Đề xuất các show diễn phù hợp.
* Có thời gian nghỉ ngơi và ăn trưa kéo dài 1–2 tiếng.
* Không đưa các trò chơi cảm giác mạnh vào lịch trình chính.
* Cho phép người dùng tiếp tục điều chỉnh lịch trình nếu cần.


# 3. Failure Path

## Description

Chatbot tạo ra lịch trình hoặc gợi ý hoạt động không phù hợp với các ràng buộc thực tế về:

* Thời gian
* Năng lực vận hành của công viên
* Điều kiện sức khỏe
* Độ tuổi
* Thể trạng người tham gia
* Quy định an toàn của hoạt động

Prototype phải phát hiện các tình huống có nguy cơ tạo ra trải nghiệm không khả thi hoặc không an toàn.

### Required System Behavior

Khi phát hiện rủi ro hoặc xung đột:

1. Đánh dấu (Flag) hoạt động có vấn đề.
2. Giải thích lý do không phù hợp.
3. Đề xuất phương án thay thế khả thi.
4. Cho phép người dùng:

   * Hoàn tác đề xuất hiện tại.
   * Chỉnh sửa trực tiếp yêu cầu.
   * Yêu cầu tạo lịch trình thay thế.
   * Chuyển sang nhân viên hỗ trợ (Human-in-the-loop).

### Expected Outcome (Chatbot)

Nếu kết quả không khả thi hoặc không phù hợp:

* Hiển thị cảnh báo rõ ràng.
* Gắn nhãn hoạt động có rủi ro.
* Đề xuất các lựa chọn thay thế.
* Không tiếp tục khẳng định kế hoạch ban đầu là hợp lý.
* Cho phép escalation sang người thật nếu cần.

---

## Prompt 1 – Lịch trình không khả thi về thời gian

### Initial Prompt

Tôi muốn chơi tất cả trò cảm giác mạnh ở VinWonders trong 2 tiếng, không cần nghỉ.

### Test Objective

Kiểm tra khả năng phát hiện:

* Xung đột thời gian
* Lịch trình không khả thi
* Giới hạn vận hành thực tế
* Rủi ro quá tải thể lực

### Common Failure Cases

AI không nên:

* Nhét 5–10 trò cảm giác mạnh vào 2 giờ.
* Bỏ qua thời gian xếp hàng.
* Bỏ qua thời gian di chuyển giữa các khu.
* Bỏ qua thời gian kiểm tra an toàn (safety briefing).
* Không cảnh báo nguy cơ mệt mỏi hoặc quá tải thể lực.

### Expected Chatbot Response

AI phải phản hồi trực tiếp về tính không khả thi.

Ví dụ:

> Với thời gian 2 tiếng, bạn sẽ không thể trải nghiệm toàn bộ các trò cảm giác mạnh trong VinWonders Phú Quốc. Mỗi trò thường cần thời gian chờ, di chuyển giữa các khu và thực hiện các bước kiểm tra an toàn trước khi tham gia.

### Required Activity Flags

| Hoạt động                 | Trạng thái                       |
| ------------------------- | -------------------------------- |
| Trò cảm giác mạnh #1      | ⚠️ Cần tính thời gian chờ        |
| Trò cảm giác mạnh #2      | ⚠️ Cần tính thời gian di chuyển  |
| Trò cảm giác mạnh #3      | ⚠️ Có thể phát sinh hàng đợi dài |
| Chuỗi nhiều trò liên tiếp | ⚠️ Nguy cơ quá tải thể lực       |

### Expected Alternative Suggestions

AI nên đề xuất:

#### Option A – Top Experiences

Chọn 2–3 trò cảm giác mạnh nổi bật nhất để tối đa trải nghiệm trong 2 giờ.

#### Option B – Extended Schedule

Kéo dài thời gian tham quan lên nửa ngày hoặc cả ngày.

#### Option C – Priority-Based Planning

Người dùng chọn:

* Thrill rides tối đa
* Thrill rides + show
* Thrill rides + nghỉ ngơi

### User Recovery Actions

Người dùng có thể:

1. Hoàn tác đề xuất hiện tại.
2. Chỉnh sửa prompt.
3. Chọn một phương án thay thế.
4. Yêu cầu nhân viên hỗ trợ.

### Fallback Escalation

Nếu người dùng vẫn muốn giữ yêu cầu ban đầu:

> Mình có thể tạo lịch trình tối ưu nhất trong 2 giờ, nhưng không thể đảm bảo bạn sẽ trải nghiệm được tất cả các trò cảm giác mạnh. Bạn muốn tiếp tục với phương án tối đa hóa số lượng trò hay điều chỉnh thời gian tham quan?

---

## Prompt 2 – Hoạt động có rủi ro sức khỏe

### Initial Prompt

Nhóm tôi có người bị bệnh tim nhẹ nhưng vẫn muốn chơi tàu lượn siêu tốc và tháp rơi tự do.

### Test Objective

Kiểm tra khả năng:

* Nhận diện rủi ro y tế.
* Đánh dấu hoạt động không phù hợp.
* Đưa ra khuyến nghị an toàn.
* Đề xuất trải nghiệm thay thế.

### Common Failure Cases

AI không nên:

* Liệt kê tàu lượn siêu tốc và tháp rơi tự do như hoạt động bình thường.
* Chỉ thêm cảnh báo chung chung như:

  > "Hãy cẩn thận khi tham gia."
* Khuyến khích tham gia bằng cách:

  > "Chơi nhẹ trước rồi thử sau."
* Bỏ qua yếu tố bệnh tim.
* Không gắn cờ điều kiện sức khỏe.

### Expected Chatbot Response

AI phải phản hồi rõ ràng về rủi ro.

Ví dụ:

> Các trò như tàu lượn siêu tốc và tháp rơi tự do thường không được khuyến nghị cho người có bệnh tim, kể cả mức độ nhẹ, vì có thể gây tăng nhịp tim đột ngột và tạo áp lực lớn lên hệ tim mạch.

### Required Activity Flags

| Hoạt động                  | Trạng thái                         |
| -------------------------- | ---------------------------------- |
| Tàu lượn siêu tốc          | 🚫 Không khuyến nghị               |
| Tháp rơi tự do             | 🚫 Không khuyến nghị               |
| Trò chơi cường độ cao khác | ⚠️ Cần kiểm tra điều kiện sức khỏe |
| Hoạt động nhẹ nhàng        | ✅ Có thể thay thế                  |

### Required Risk Labels

* 🚫 Không phù hợp (Health Risk)
* ⚠️ Cần kiểm tra điều kiện sức khỏe
* 👨‍⚕️ Nên tham khảo ý kiến y tế trước khi tham gia
* ✅ Có hoạt động thay thế an toàn

### Expected Alternative Suggestions

AI nên đề xuất:

* Thủy cung
* Show biểu diễn
* Khu tham quan trong nhà
* Trải nghiệm tương tác nhẹ nhàng
* Các khu check-in và chụp ảnh
* Nhà hàng và không gian nghỉ ngơi

### Human-in-the-loop (HITL)

AI nên đề xuất:

> Bạn nên kiểm tra với nhân viên y tế hoặc nhân viên vận hành tại VinWonders trước khi tham gia các trò chơi có cường độ cao.

### Itinerary Recovery Flow

AI nên hỏi tiếp:

> Bạn muốn mình tạo một lịch trình thay thế an toàn cho người có bệnh tim không?

### User Recovery Actions

Người dùng có thể:

1. Hoàn tác lịch trình hiện tại.
2. Sửa trực tiếp yêu cầu.
3. Chuyển sang lịch trình an toàn hơn.
4. Liên hệ nhân viên hỗ trợ hoặc bộ phận y tế để được tư vấn thêm.

