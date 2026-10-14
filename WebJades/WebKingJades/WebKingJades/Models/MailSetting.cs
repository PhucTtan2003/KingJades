namespace WebKingJades.Settings
{
    public class MailSettings
    {
        public string Host { get; set; } = "";

        public int Port { get; set; } = 587;

        public string SenderName { get; set; } = "";

        public string SenderEmail { get; set; } = "";

        public string Username { get; set; } = "";

        public string Password { get; set; } = "";
    }
}