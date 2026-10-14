using System.Globalization;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace WebKingJades.Controllers;

// Google Places API (New). Khong de API key trong React / response.
[ApiController]
[Route("api/public/google-reviews")]
public sealed class GoogleReviewsController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<GoogleReviewsController> _logger;
    private static readonly HttpClient Http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
    private static readonly SemaphoreSlim PlaceIdLock = new SemaphoreSlim(1, 1);
    private static string? _resolvedPlaceId;

    public GoogleReviewsController(IConfiguration config, ILogger<GoogleReviewsController> logger)
    {
        _config = config;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var apiKey = _config["GoogleMaps:ApiKey"] ?? Environment.GetEnvironmentVariable("GOOGLE_MAPS_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
            return StatusCode(503, new { message = "Google Places API chưa được cấu hình." });

        try
        {
            var placeId = _config["GoogleMaps:PlaceId"];
            if (string.IsNullOrWhiteSpace(placeId))
                placeId = await ResolvePlaceIdAsync(apiKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(placeId))
                return StatusCode(503, new { message = "Không xác định được Google Place ID của King Jades. Hãy cấu hình GoogleMaps:PlaceId." });

            var uri = "https://places.googleapis.com/v1/places/" + Uri.EscapeDataString(placeId) + "?languageCode=vi";
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            request.Headers.TryAddWithoutValidation("X-Goog-Api-Key", apiKey);
            request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", "id,displayName,formattedAddress,rating,userRatingCount,reviews,googleMapsUri");
            using var response = await Http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Google Places returned HTTP {StatusCode}", (int)response.StatusCode);
                return StatusCode(502, new { message = "Không lấy được đánh giá Google Maps lúc này." });
            }

            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var place = json.RootElement;
            var reviews = new List<object>();
            if (place.TryGetProperty("reviews", out var rawReviews) && rawReviews.ValueKind == JsonValueKind.Array)
            {
                foreach (var review in rawReviews.EnumerateArray())
                {
                    var author = Prop(review, "authorAttribution");
                    var reviewText = Str(Prop(review, "text"), "text");
                    if (string.IsNullOrWhiteSpace(reviewText))
                        reviewText = Str(Prop(review, "originalText"), "text");
                    if (string.IsNullOrWhiteSpace(reviewText)) continue;
                    reviews.Add(new
                    {
                        id = Str(review, "name") ?? Guid.NewGuid().ToString("N"),
                        rating = Num(review, "rating"),
                        text = reviewText,
                        publishedAt = Str(review, "publishTime"),
                        relativeTime = Str(review, "relativePublishTimeDescription"),
                        authorName = Str(author, "displayName") ?? "Người đánh giá Google",
                        authorUrl = Str(author, "uri"),
                        authorPhotoUrl = Str(author, "photoUri"),
                        reviewUrl = Str(review, "googleMapsUri")
                    });
                }
            }

            Response.Headers["Cache-Control"] = "no-store, max-age=0";
            return Ok(new
            {
                placeName = Str(Prop(place, "displayName"), "text"),
                rating = Num(place, "rating"),
                userRatingCount = Num(place, "userRatingCount"),
                googleMapsUri = Str(place, "googleMapsUri"),
                reviews
            });
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(504, new { message = "Google Maps phản hồi quá thời gian." });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Google Places network error");
            return StatusCode(502, new { message = "Không kết nối được Google Maps." });
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Google Places invalid JSON");
            return StatusCode(502, new { message = "Google Maps trả dữ liệu không hợp lệ." });
        }
    }

    private static JsonElement Prop(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value)
            ? value : default;

    private static string? Str(JsonElement element, string name)
    {
        var value = Prop(element, name);
        return value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    }

    private static double? Num(JsonElement element, string name)
    {
        var value = Prop(element, name);
        return value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number) ? number : null;
    }

    // Chi luu Place ID (duoc Google cho phep); khong luu review, rating, ten hay data khac.
    private static async Task<string?> ResolvePlaceIdAsync(string apiKey, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(_resolvedPlaceId)) return _resolvedPlaceId;
        await PlaceIdLock.WaitAsync(cancellationToken);
        try
        {
            if (!string.IsNullOrWhiteSpace(_resolvedPlaceId)) return _resolvedPlaceId;
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://places.googleapis.com/v1/places:searchText");
            request.Headers.TryAddWithoutValidation("X-Goog-Api-Key", apiKey);
            request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress");
            request.Content = new StringContent(
                JsonSerializer.Serialize(new { textQuery = "King Jades 388 Nguyễn Tri Phương Hồ Chí Minh", languageCode = "vi" }),
                Encoding.UTF8, "application/json");
            using var response = await Http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            if (!json.RootElement.TryGetProperty("places", out var places) || places.ValueKind != JsonValueKind.Array)
                return null;
            foreach (var place in places.EnumerateArray())
            {
                var address = Normalize(Str(place, "formattedAddress"));
                var name = Normalize(Str(Prop(place, "displayName"), "text"));
                if (name.Contains("king jade") && address.Contains("388") && address.Contains("nguyen tri phuong"))
                {
                    _resolvedPlaceId = Str(place, "id");
                    return _resolvedPlaceId;
                }
            }
            return null;
        }
        finally { PlaceIdLock.Release(); }
    }

    private static string Normalize(string? value)
    {
        if (value == null) return "";
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                builder.Append(c == 'đ' || c == 'Đ' ? 'd' : char.ToLowerInvariant(c));
        }
        return builder.ToString().ToLowerInvariant();
    }
}
