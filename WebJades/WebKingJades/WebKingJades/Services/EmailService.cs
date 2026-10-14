using Microsoft.Extensions.Options;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using WebKingJades.Settings;

namespace WebKingJades.Services
{
    public class EmailService : IEmailService
    {
        private readonly MailSettings _settings;

        public EmailService(
            IOptions<MailSettings> options)
        {
            _settings = options.Value;
        }

        // =========================================================
        // SEND VERIFICATION CODE EMAIL
        //
        // verificationCode = mã OTP 6 số
        // Ví dụ: 631578
        // =========================================================

        public async Task SendVerificationEmailAsync(
            string toEmail,
            string username,
            string verificationCode)
        {
            // =====================================================
            // VALIDATE
            // =====================================================

            if (string.IsNullOrWhiteSpace(toEmail))
            {
                throw new ArgumentException(
                    "Email người nhận không hợp lệ."
                );
            }

            if (string.IsNullOrWhiteSpace(verificationCode))
            {
                throw new ArgumentException(
                    "Mã xác thực không hợp lệ."
                );
            }

            if (string.IsNullOrWhiteSpace(_settings.Host))
            {
                throw new InvalidOperationException(
                    "MailSettings:Host chưa được cấu hình."
                );
            }

            if (string.IsNullOrWhiteSpace(_settings.Username))
            {
                throw new InvalidOperationException(
                    "MailSettings:Username chưa được cấu hình."
                );
            }

            if (string.IsNullOrWhiteSpace(_settings.Password))
            {
                throw new InvalidOperationException(
                    "MailSettings:Password chưa được cấu hình."
                );
            }

            // =====================================================
            // SENDER
            // =====================================================

            var senderEmail =
                string.IsNullOrWhiteSpace(
                    _settings.SenderEmail
                )
                    ? _settings.Username
                    : _settings.SenderEmail;

            var senderName =
                string.IsNullOrWhiteSpace(
                    _settings.SenderName
                )
                    ? "King Jades"
                    : _settings.SenderName;

            // =====================================================
            // SAFE CONTENT
            // =====================================================

            var safeUsername =
                WebUtility.HtmlEncode(
                    username
                );

            var safeCode =
                WebUtility.HtmlEncode(
                    verificationCode.Trim()
                );

            // =====================================================
            // TẠO 6 Ô OTP
            // =====================================================

            var otpBoxesHtml =
                string.Join(
                    "",
                    safeCode
                        .ToCharArray()
                        .Select(
                            character => $@"
<td style=""
    padding:0 3px;
"">
    <div style=""
        width:42px;
        height:54px;

        line-height:54px;

        text-align:center;

        border-radius:14px;

        border:
            1.5px solid #DFC86B;

        background:
            #FFFDF7;

        color:
            #142543;

        font-size:24px;

        font-weight:700;

        box-shadow:
            0 7px 18px
            rgba(20,37,67,.07);
    "">
        {character}
    </div>
</td>"
                        )
                );

            // =====================================================
            // CREATE MAIL
            // =====================================================

            using var message =
                new MailMessage();

            message.From =
                new MailAddress(
                    senderEmail,
                    senderName,
                    Encoding.UTF8
                );

            message.To.Add(
                new MailAddress(
                    toEmail
                )
            );

            message.Subject =
                "Mã xác thực tài khoản King Jades";

            message.SubjectEncoding =
                Encoding.UTF8;

            message.BodyEncoding =
                Encoding.UTF8;

            message.IsBodyHtml =
                true;

            // =====================================================
            // EMAIL HTML
            // =====================================================

            message.Body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""UTF-8"" />

    <meta
        name=""viewport""
        content=""width=device-width, initial-scale=1.0""
    />
</head>

<body style=""
    margin:0;
    padding:0;

    background:#F4F1E8;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    color:#374151;
"">

    <table
        role=""presentation""
        width=""100%""
        cellpadding=""0""
        cellspacing=""0""
        border=""0""
        style=""
            width:100%;
            background:#F4F1E8;
            padding:32px 16px;
        ""
    >
        <tr>
            <td align=""center"">

                <!-- =================================================
                     MAIN CARD
                ================================================== -->

                <table
                    role=""presentation""
                    width=""100%""
                    cellpadding=""0""
                    cellspacing=""0""
                    border=""0""
                    style=""
                        width:100%;
                        max-width:640px;

                        background:#FFFFFF;

                        border:
                            1px solid #ECE2C1;

                        border-radius:24px;

                        overflow:hidden;

                        box-shadow:
                            0 18px 45px
                            rgba(20,37,67,.08);
                    ""
                >

                    <!-- =============================================
                         HEADER
                    ============================================== -->

                    <tr>
                        <td
                            align=""center""
                            style=""
                                padding:
                                    34px 24px 30px;

                                background:
                                    #142543;
                            ""
                        >

                            <div style=""
                                margin-bottom:10px;

                                color:#E1BD42;

                                font-size:14px;

                                font-weight:700;

                                letter-spacing:4px;

                                text-transform:
                                    uppercase;
                            "">
                                King Jades
                            </div>

                            <div style=""
                                margin:0;

                                color:#FFFFFF;

                                font-size:30px;

                                font-weight:700;

                                line-height:1.25;
                            "">
                                Mã xác thực tài khoản
                            </div>

                            <div style=""
                                margin-top:10px;

                                color:
                                    rgba(
                                        255,
                                        255,
                                        255,
                                        .75
                                    );

                                font-size:14px;

                                line-height:1.6;
                            "">
                                Hoàn tất đăng ký
                                tài khoản King Jades
                            </div>

                        </td>
                    </tr>

                    <!-- =============================================
                         BODY
                    ============================================== -->

                    <tr>
                        <td style=""
                            padding:
                                36px
                                34px
                                30px;
                        "">

                            <h2 style=""
                                margin:
                                    0
                                    0
                                    16px;

                                color:#142543;

                                font-size:25px;

                                line-height:1.4;
                            "">
                                Xin chào
                                {safeUsername},
                            </h2>

                            <p style=""
                                margin:
                                    0
                                    0
                                    12px;

                                color:#545B67;

                                font-size:15px;

                                line-height:1.8;
                            "">
                                Cảm ơn bạn đã đăng ký
                                tài khoản tại
                                <strong
                                    style=""
                                        color:#142543;
                                    ""
                                >
                                    King Jades
                                </strong>.
                            </p>

                            <p style=""
                                margin:
                                    0
                                    0
                                    26px;

                                color:#545B67;

                                font-size:15px;

                                line-height:1.8;
                            "">
                                Vui lòng nhập mã xác thực
                                dưới đây tại trang đăng ký
                                để kích hoạt tài khoản.
                            </p>

                            <!-- =====================================
                                 OTP CARD
                            ====================================== -->

                            <table
                                role=""presentation""
                                width=""100%""
                                cellpadding=""0""
                                cellspacing=""0""
                                border=""0""
                                style=""
                                    width:100%;

                                    background:
                                        #FBF7EB;

                                    border:
                                        1px solid
                                        #E8D89E;

                                    border-radius:
                                        20px;
                                ""
                            >
                                <tr>
                                    <td
                                        align=""center""
                                        style=""
                                            padding:
                                                26px
                                                14px
                                                28px;
                                        ""
                                    >

                                        <div style=""
                                            margin-bottom:
                                                19px;

                                            color:
                                                #A57F1B;

                                            font-size:
                                                12px;

                                            font-weight:
                                                700;

                                            letter-spacing:
                                                2px;

                                            text-transform:
                                                uppercase;
                                        "">
                                            Mã xác thực
                                            của bạn
                                        </div>

                                        <table
                                            role=""presentation""
                                            cellpadding=""0""
                                            cellspacing=""0""
                                            border=""0""
                                            align=""center""
                                            style=""
                                                margin:
                                                    0 auto;
                                            ""
                                        >
                                            <tr>
                                                {otpBoxesHtml}
                                            </tr>
                                        </table>

                                    </td>
                                </tr>
                            </table>

                            <!-- =====================================
                                 EXPIRE
                            ====================================== -->

                            <div style=""
                                margin-top:20px;

                                padding:
                                    15px 17px;

                                border-radius:
                                    14px;

                                border:
                                    1px solid
                                    #EFE2B4;

                                background:
                                    #FFFCF4;

                                color:#626874;

                                font-size:13px;

                                line-height:1.7;
                            "">

                                <strong style=""
                                    color:#142543;
                                "">
                                    Lưu ý:
                                </strong>

                                <br />

                                • Mã xác thực chỉ sử dụng
                                được một lần.

                                <br />

                                • Mã có hiệu lực trong
                                <strong
                                    style=""
                                        color:#142543;
                                    ""
                                >
                                    10 phút
                                </strong>.

                                <br />

                                • Không chia sẻ mã này
                                cho người khác.

                            </div>

                            <p style=""
                                margin:
                                    22px
                                    0
                                    0;

                                color:#929292;

                                font-size:12px;

                                line-height:1.7;
                            "">
                                Nếu bạn không thực hiện
                                đăng ký tài khoản King Jades,
                                bạn có thể bỏ qua email này.
                            </p>

                        </td>
                    </tr>

                    <!-- =============================================
                         FOOTER
                    ============================================== -->

                    <tr>
                        <td
                            align=""center""
                            style=""
                                padding:
                                    20px
                                    24px
                                    24px;

                                border-top:
                                    1px solid
                                    #F0E6C7;

                                background:
                                    #FFFDF8;

                                color:#8C8F95;

                                font-size:12px;

                                line-height:1.7;
                            ""
                        >

                            <strong style=""
                                color:#142543;
                            "">
                                KING JADES
                            </strong>

                            <br />

                            Tự nhiên · Thật ·
                            Nền tảng

                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>";

            // =====================================================
            // SMTP
            // =====================================================

            using var smtp =
                new SmtpClient(
                    _settings.Host,
                    _settings.Port
                );

            smtp.EnableSsl =
                true;

            smtp.UseDefaultCredentials =
                false;

            smtp.Credentials =
                new NetworkCredential(
                    _settings.Username,
                    _settings.Password
                );

            smtp.DeliveryMethod =
                SmtpDeliveryMethod.Network;

            smtp.Timeout =
                30000;

            // =====================================================
            // SEND
            // =====================================================

            await smtp.SendMailAsync(
                message
            );
        }
    }
}