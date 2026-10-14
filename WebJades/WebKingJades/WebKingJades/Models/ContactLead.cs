using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebKingJades.Models
{
    [BsonIgnoreExtraElements]
    public class ContactLead
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

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

        /*
         * zalo | phone | email
         */
        public string PreferredContactChannel { get; set; }
            = "zalo";

        public string Message { get; set; }
            = string.Empty;

        public string Source { get; set; }
            = "contact_page";

        /*
         * new
         * contacted
         * quoted
         * closed
         * cancelled
         */
        public string Status { get; set; }
            = "new";

        public string InternalNote { get; set; }
            = string.Empty;

        public string HandledBy { get; set; }
            = string.Empty;

        public DateTime? HandledAtUtc { get; set; }

        public string IpAddress { get; set; }
            = string.Empty;

        public string UserAgent { get; set; }
            = string.Empty;

        public DateTime CreatedAtUtc { get; set; }
            = DateTime.UtcNow;

        public DateTime UpdatedAtUtc { get; set; }
            = DateTime.UtcNow;
    }
}