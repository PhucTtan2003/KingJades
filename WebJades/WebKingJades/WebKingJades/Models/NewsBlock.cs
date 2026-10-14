using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebKingJades.Features.News.Models;

public sealed class NewsBlock
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [BsonRepresentation(BsonType.String)]
    public NewsBlockType Type { get; set; }

    public int Order { get; set; }

    public BsonDocument Content { get; set; } = new();

    public BsonDocument Settings { get; set; } = new();

    public NewsBlockResponsive Responsive { get; set; } = new();
}

public sealed class NewsBlockResponsive
{
    public bool HideOnDesktop { get; set; }
    public bool HideOnTablet { get; set; }
    public bool HideOnMobile { get; set; }
    public bool StackOnMobile { get; set; } = true;
}
