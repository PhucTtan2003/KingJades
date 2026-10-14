using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Models;

namespace WebKingJades.Features.News.Infrastructure;

public static class NewsJsonMapper
{
    public static NewsBlock ToModel(this NewsBlockRequest request, int fallbackOrder)
    {
        return new NewsBlock
        {
            Id = string.IsNullOrWhiteSpace(request.Id)
                ? Guid.NewGuid().ToString("N")
                : request.Id.Trim(),
            Type = request.Type,
            Order = request.Order >= 0 ? request.Order : fallbackOrder,
            Content = ToBsonDocument(request.Content),
            Settings = ToBsonDocument(request.Settings),
            Responsive = request.Responsive ?? new NewsBlockResponsive()
        };
    }

    public static NewsBlockResponse ToResponse(this NewsBlock block)
    {
        return new NewsBlockResponse
        {
            Id = block.Id,
            Type = block.Type,
            Order = block.Order,
            Content = ToJsonElement(block.Content),
            Settings = ToJsonElement(block.Settings),
            Responsive = block.Responsive
        };
    }

    public static BsonDocument ToBsonDocument(JsonElement element)
    {
        if (element.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return new BsonDocument();
        }

        if (element.ValueKind != JsonValueKind.Object)
        {
            throw new ArgumentException("Content và Settings của block phải là JSON object.");
        }

        return BsonDocument.Parse(element.GetRawText());
    }

    public static JsonElement ToJsonElement(BsonDocument document)
    {
        var json = document.ToJson(new JsonWriterSettings
        {
            OutputMode = JsonOutputMode.RelaxedExtendedJson
        });

        using var parsed = JsonDocument.Parse(json);
        return parsed.RootElement.Clone();
    }
}
