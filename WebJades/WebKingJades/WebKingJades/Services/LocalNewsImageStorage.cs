namespace WebKingJades.Features.News.Services;

public sealed class LocalNewsImageStorage : INewsImageStorage
{
    private const long MaxFileSize = 8 * 1024 * 1024;

    private static readonly HashSet<string> AllowedContentTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        };

    private static readonly Dictionary<string, string> Extensions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
            ["image/gif"] = ".gif"
        };

    private readonly IWebHostEnvironment _environment;

    public LocalNewsImageStorage(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveAsync(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            throw new NewsValidationException(
                "Chưa chọn hình ảnh.");
        }

        if (file.Length > MaxFileSize)
        {
            throw new NewsValidationException(
                "Ảnh không được vượt quá 8 MB.");
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            throw new NewsValidationException(
                "Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF.");
        }

        var now = DateTime.UtcNow;
        var relativeFolder = Path.Combine(
            "uploads",
            "news",
            now.ToString("yyyy"),
            now.ToString("MM"));

        var webRoot = _environment.WebRootPath;

        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(
                _environment.ContentRootPath,
                "wwwroot");
        }

        var physicalFolder = Path.Combine(
            webRoot,
            relativeFolder);

        Directory.CreateDirectory(physicalFolder);

        var fileName = $"{Guid.NewGuid():N}{Extensions[file.ContentType]}";
        var physicalPath = Path.Combine(physicalFolder, fileName);

        await using var stream = new FileStream(
            physicalPath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            81920,
            useAsync: true);

        await file.CopyToAsync(stream, cancellationToken);

        return "/" + Path.Combine(relativeFolder, fileName)
            .Replace("\\", "/");
    }
}
