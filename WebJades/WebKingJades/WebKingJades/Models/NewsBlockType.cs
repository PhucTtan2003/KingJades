using System.Text.Json.Serialization;

namespace WebKingJades.Features.News.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NewsBlockType
{
    Heading = 0,
    Text = 1,
    Image = 2,
    ImageText = 3,
    Gallery = 4,
    Quote = 5,
    Video = 6,
    Divider = 7,
    Callout = 8,
    Button = 9,
    TwoColumn = 10,
    ThreeColumn = 11,
    Product = 12,
    RelatedNews = 13
}
