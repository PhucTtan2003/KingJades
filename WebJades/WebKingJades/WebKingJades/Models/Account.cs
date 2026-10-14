using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebKingJades.Models
{
    /*
     * Cho phép MongoDB có thêm field cũ/mới
     * mà model chưa khai báo.
     *
     * Điều này giúp tránh lỗi deserialize
     * khi collection có document khác schema.
     */
    [BsonIgnoreExtraElements]
    public class Account
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("email")]
        public string Email { get; set; }
            = string.Empty;

        [BsonElement("phone")]
        public string Phone { get; set; }
            = string.Empty;

        [BsonElement("username")]
        public string Username { get; set; }
            = string.Empty;

        [BsonElement("password")]
        public string Password { get; set; }
            = string.Empty;

        [BsonElement("roleId")]
        public int RoleId { get; set; }

        [BsonElement("status")]
        public string Status { get; set; }
            = "active";

        // =============================================
        // EMAIL VERIFICATION
        // =============================================

        [BsonElement("isEmailVerified")]
        public bool IsEmailVerified { get; set; }
            = false;

        [BsonElement("emailVerificationToken")]
        [BsonIgnoreIfNull]
        public string? EmailVerificationToken
        {
            get;
            set;
        }

        [BsonElement("emailVerificationExpiresAtUtc")]
        [BsonIgnoreIfNull]
        public DateTime?
            EmailVerificationExpiresAtUtc
        {
            get;
            set;
        }
    }
}