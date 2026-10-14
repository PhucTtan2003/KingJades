using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using WebKingJades.Models;
using WebKingJades.Settings;

namespace WebKingJades.Controllers;

[ApiController]
public class DestinyFeedbacksController : ControllerBase
{
    private const int MaxFeedbacks = 30;

    private readonly IMongoCollection<DestinyFeedback> _feedbacks;

    public DestinyFeedbacksController(
        IOptions<MongoDbSettings> settings)
    {
        var mongoClient = new MongoClient(
            settings.Value.ConnectionString
        );

        var database = mongoClient.GetDatabase(
            settings.Value.DatabaseName
        );

        // Collection riêng cho slide feedback.
        // Không đi vào ContactLeads và không xuất hiện trong Admin.
        _feedbacks = database.GetCollection<DestinyFeedback>(
            "DestinyFeedbacks"
        );
    }

    // =====================================================
    // PUBLIC - 30 FEEDBACK GẦN NHẤT
    // GET: /api/destiny-feedbacks
    // Mới nhất luôn đứng đầu.
    // =====================================================
    [AllowAnonymous]
    [HttpGet("api/destiny-feedbacks")]
    public async Task<IActionResult> GetLatest()
    {
        var sort = Builders<DestinyFeedback>
            .Sort
            .Descending(x => x.CreatedAtUtc)
            .Descending(x => x.Id);

        var feedbacks = await _feedbacks
            .Find(Builders<DestinyFeedback>.Filter.Empty)
            .Sort(sort)
            .Limit(MaxFeedbacks)
            .ToListAsync();

        return Ok(new
        {
            feedbacks = feedbacks.Select(ToPublicItem),
            total = feedbacks.Count
        });
    }

    // =====================================================
    // PUBLIC - GỬI FEEDBACK
    // POST: /api/destiny-feedbacks
    // Sau khi thêm:
    // - chỉ giữ 30 cái mới nhất
    // - cái thứ 31 trở đi bị xóa từ cũ nhất
    // =====================================================
    [AllowAnonymous]
    [HttpPost("api/destiny-feedbacks")]
    public async Task<IActionResult> Create(
        [FromBody] CreateDestinyFeedbackRequest? request)
    {
        if (request == null)
        {
            return BadRequest(new
            {
                message = "Dữ liệu feedback không hợp lệ."
            });
        }

        var displayName =
            (request.DisplayName ?? "").Trim();

        var message =
            (request.Message ?? "").Trim();

        if (request.Rating < 1 || request.Rating > 5)
        {
            return BadRequest(new
            {
                message = "Đánh giá phải từ 1 đến 5 sao."
            });
        }

        if (message.Length < 8)
        {
            return BadRequest(new
            {
                message = "Cảm nhận cần ít nhất 8 ký tự."
            });
        }

        if (message.Length > 600)
        {
            return BadRequest(new
            {
                message = "Cảm nhận tối đa 600 ký tự."
            });
        }

        if (string.IsNullOrWhiteSpace(displayName))
        {
            displayName = "Khách hàng";
        }

        if (displayName.Length > 80)
        {
            displayName = displayName[..80];
        }

        var feedback = new DestinyFeedback
        {
            DisplayName = displayName,
            Rating = request.Rating,
            Message = message,
            MainElement = SafeText(
                request.MainElement,
                40
            ),
            MissingElement = SafeText(
                request.MissingElement,
                80
            ),
            CreatedAtUtc = DateTime.UtcNow
        };

        await _feedbacks.InsertOneAsync(feedback);

        // Sau khi insert, giữ đúng 30 feedback mới nhất.
        // Feedback cũ nhất từ vị trí 31 trở đi sẽ bị xóa.
        await TrimToLatestThirtyAsync();

        return StatusCode(
            StatusCodes.Status201Created,
            new
            {
                success = true,
                feedback = ToPublicItem(feedback)
            }
        );
    }

    private async Task TrimToLatestThirtyAsync()
    {
        var sort = Builders<DestinyFeedback>
            .Sort
            .Descending(x => x.CreatedAtUtc)
            .Descending(x => x.Id);

        var staleIds = await _feedbacks
            .Find(Builders<DestinyFeedback>.Filter.Empty)
            .Sort(sort)
            .Skip(MaxFeedbacks)
            .Project(x => x.Id)
            .ToListAsync();

        var idsToDelete = staleIds
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Cast<string>()
            .ToList();

        if (idsToDelete.Count == 0)
        {
            return;
        }

        var deleteFilter =
            Builders<DestinyFeedback>.Filter.In(
                x => x.Id,
                idsToDelete
            );

        await _feedbacks.DeleteManyAsync(deleteFilter);
    }

    private static object ToPublicItem(
        DestinyFeedback feedback)
    {
        return new
        {
            id = feedback.Id ?? "",
            displayName = feedback.DisplayName,
            rating = feedback.Rating,
            message = feedback.Message,
            mainElement = feedback.MainElement,
            missingElement = feedback.MissingElement,
            createdAtUtc = feedback.CreatedAtUtc
        };
    }

    private static string SafeText(
        string? value,
        int maxLength)
    {
        var text = (value ?? "").Trim();

        if (text.Length <= maxLength)
        {
            return text;
        }

        return text[..maxLength];
    }

    public sealed class CreateDestinyFeedbackRequest
    {
        public string? DisplayName { get; set; }

        public int Rating { get; set; }

        public string? Message { get; set; }

        public string? MainElement { get; set; }

        public string? MissingElement { get; set; }
    }
}
