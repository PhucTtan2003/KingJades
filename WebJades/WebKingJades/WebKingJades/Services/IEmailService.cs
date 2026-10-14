namespace WebKingJades.Services
{
    public interface IEmailService
    {
        Task SendVerificationEmailAsync(
            string toEmail,
            string username,
            string verificationUrl
        );
    }
}