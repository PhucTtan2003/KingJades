namespace WebKingJades.Models.Dtos
{
    public class UpdateContactLeadStatusRequest
    {
        public string Status { get; set; } = "new";
        public string InternalNote { get; set; } = string.Empty;

    }
}
