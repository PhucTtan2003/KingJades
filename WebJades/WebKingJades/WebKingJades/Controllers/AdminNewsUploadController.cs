using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebKingJades.Features.News.Services;

namespace WebKingJades.Features.News.Controllers;

[ApiController]
[Route("api/admin/news/uploads")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminNewsUploadController : ControllerBase
{
    private const long MaximumFileSize =
        25L * 1024L * 1024L;

    private static readonly HashSet<string>
        AllowedContentTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif"
        };

    private static readonly HashSet<string>
        AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            ".avif"
        };

    private readonly INewsImageStorage _storage;

    public AdminNewsUploadController(
        INewsImageStorage storage)
    {
        _storage = storage;
    }

    // POST:
    // /api/admin/news/uploads/image
    [HttpPost("image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaximumFileSize)]
    [RequestFormLimits(
        MultipartBodyLengthLimit =
            MaximumFileSize)]
    public async Task<ActionResult<object>>
        UploadImage(
            [FromForm] IFormFile? file,
            CancellationToken cancellationToken)
    {
        if (file == null ||
            file.Length == 0)
        {
            return BadRequest(new
            {
                message =
                    "Server không nhận được file ảnh. Hãy thử lại sau khi frontend không set Content-Type multipart/form-data thủ công."
            });
        }

        if (file.Length >
            MaximumFileSize)
        {
            return BadRequest(new
            {
                message =
                    "Dung lượng hình ảnh không được vượt quá 25 MB."
            });
        }

        var extension =
            Path.GetExtension(
                    file.FileName)
                .ToLowerInvariant();

        if (!AllowedContentTypes.Contains(
                file.ContentType) ||
            !AllowedExtensions.Contains(
                extension))
        {
            return BadRequest(new
            {
                message =
                    "Chỉ hỗ trợ JPG, JPEG, PNG, WEBP, GIF hoặc AVIF. HEIC/HEIF cần chuyển sang JPG hoặc WEBP."
            });
        }

        try
        {
            var url =
                await _storage.SaveAsync(
                    file,
                    cancellationToken
                );

            if (string.IsNullOrWhiteSpace(
                    url))
            {
                return StatusCode(
                    StatusCodes
                        .Status500InternalServerError,
                    new
                    {
                        message =
                            "Đã lưu file nhưng không tạo được URL ảnh."
                    });
            }

            return Ok(new
            {
                message =
                    "Upload hình ảnh thành công.",
                url
            });
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            return StatusCode(
                StatusCodes
                    .Status500InternalServerError,
                new
                {
                    message =
                        $"Không thể lưu ảnh: {exception.Message}"
                });
        }
    }
}
