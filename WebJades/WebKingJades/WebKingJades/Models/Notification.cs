using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;


namespace WebKingJades.Models;


[BsonIgnoreExtraElements]
public class Notification
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }


    public string Title { get; set; }
        = string.Empty;



    public string Message { get; set; }
        = string.Empty;



    public string Type { get; set; }
        = string.Empty;



    public string TargetUrl { get; set; }
        = string.Empty;



    public string ReferenceId { get; set; }
        = string.Empty;



    public bool IsRead { get; set; }
        = false;



    public List<string> ReceiverRoles { get; set; }
        = new();



    public string CreatedBy { get; set; }
        = "System";



    public DateTime CreatedAtUtc { get; set; }
        = DateTime.UtcNow;



    public DateTime? ReadAtUtc { get; set; }
}
