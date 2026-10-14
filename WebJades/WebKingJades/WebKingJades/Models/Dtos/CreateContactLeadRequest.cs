namespace WebKingJades.Models.Dtos
{
    public class CreateContactLeadRequest
    {
        public string FullName { get; set; }
            = string.Empty;

        public string Phone { get; set; }
            = string.Empty;

        public string Email { get; set; }
            = string.Empty;

        public string ProductId { get; set; }
            = string.Empty;

        public string ProductName { get; set; }
            = string.Empty;

        public string ProductSlug { get; set; }
            = string.Empty;

        public string Need { get; set; }
            = string.Empty;

        // Frontend đang gửi:
        // zalo | phone | email
        public string PreferredContactChannel { get; set; }
            = "zalo";

        public string Message { get; set; }
            = string.Empty;

        public string Source { get; set; }
            = "contact_page";
    }
}