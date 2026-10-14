using System.Text.Json.Serialization;

namespace WebKingJades.Features.News.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NewsStatus
{
    Draft = 0,
    Review = 1,
    Scheduled = 2,
    Published = 3,
    Hidden = 4,
    Archived = 5
}
