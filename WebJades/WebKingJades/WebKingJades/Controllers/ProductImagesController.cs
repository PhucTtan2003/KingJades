using Microsoft.AspNetCore.Mvc;
using WebKingJades.Models;
using WebKingJades.Services;

namespace WebKingJades.Controllers;

[ApiController]
public class ProductImagesController : ControllerBase
{
    private const long MaxSingleImageBytes = 15_000_000;

    private readonly ProductService _productService;
    private readonly IWebHostEnvironment _environment;

    public ProductImagesController(
        ProductService productService,
        IWebHostEnvironment environment
    )
    {
        _productService = productService;
        _environment = environment;
    }

    [HttpPost("api/admin/products/{id}/images")]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> AddProductImages(
        string id,
        [FromForm] List<IFormFile>? images
    )
    {
        var product = await _productService.GetByIdAdminAsync(id);

        if (product == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy sản phẩm."
            });
        }

        if (images == null || images.Count == 0)
        {
            return BadRequest(new
            {
                message = "Vui lòng chọn ít nhất một hình ảnh."
            });
        }

        var uploadFolder = GetUploadFolder();
        Directory.CreateDirectory(uploadFolder);

        var nextImages = NormalizeImages(product.Images);
        var nextSortOrder = nextImages.Count + 1;
        var shouldSetFirstNewAsMain = nextImages.Count == 0;

        foreach (var file in images)
        {
            if (!IsAllowedImage(file))
            {
                return BadRequest(new
                {
                    message = $"File '{file.FileName}' không phải hình ảnh hợp lệ."
                });
            }

            if (file.Length > MaxSingleImageBytes)
            {
                return BadRequest(new
                {
                    message = $"File '{file.FileName}' vượt quá 15MB."
                });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var fileName =
                $"{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadFolder, fileName);

            await using (var stream = new FileStream(
                filePath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None
            ))
            {
                await file.CopyToAsync(stream);
            }

            nextImages.Add(new ProductImage
            {
                Url = $"/uploads/products/{fileName}",
                FileName = fileName,
                Alt = product.Name,
                IsMain = shouldSetFirstNewAsMain && nextSortOrder == 1,
                SortOrder = nextSortOrder
            });

            nextSortOrder++;
        }

        product.Images = NormalizeImages(nextImages);

        var mainImage = product.Images.FirstOrDefault(x => x.IsMain)
            ?? product.Images.FirstOrDefault();

        if (
            mainImage != null &&
            string.IsNullOrWhiteSpace(product.Seo.OgImage)
        )
        {
            product.Seo.OgImage = mainImage.Url;
        }

        await _productService.UpdateAsync(id, product);

        return Ok(new
        {
            message = "Upload hình ảnh thành công.",
            product
        });
    }

    [HttpPut("api/admin/products/{id}/images")]
    public async Task<IActionResult> UpdateProductImages(
        string id,
        [FromBody] UpdateProductImagesRequest request
    )
    {
        var product = await _productService.GetByIdAdminAsync(id);

        if (product == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy sản phẩm."
            });
        }

        var oldImages = product.Images ?? new List<ProductImage>();
        var newImages = NormalizeImages(request.Images ?? new List<ProductImage>());

        var newUrls = newImages
            .Select(x => x.Url)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var removedImages = oldImages
            .Where(x =>
                !string.IsNullOrWhiteSpace(x.Url) &&
                !newUrls.Contains(x.Url)
            )
            .ToList();

        product.Images = newImages;

        var mainImage = product.Images.FirstOrDefault(x => x.IsMain)
            ?? product.Images.FirstOrDefault();

        if (mainImage != null)
        {
            product.Seo.OgImage = mainImage.Url;
        }
        else if (
            oldImages.Any(x =>
                string.Equals(
                    x.Url,
                    product.Seo.OgImage,
                    StringComparison.OrdinalIgnoreCase
                )
            )
        )
        {
            product.Seo.OgImage = string.Empty;
        }

        var updated = await _productService.UpdateAsync(id, product);

        if (!updated)
        {
            return BadRequest(new
            {
                message = "Không thể cập nhật hình ảnh sản phẩm."
            });
        }

        DeleteRemovedLocalFiles(removedImages);

        return Ok(new
        {
            message = "Cập nhật hình ảnh thành công.",
            product
        });
    }

    private string GetUploadFolder()
    {
        var webRootPath = _environment.WebRootPath;

        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot"
            );
        }

        return Path.Combine(
            webRootPath,
            "uploads",
            "products"
        );
    }

    private void DeleteRemovedLocalFiles(
        IEnumerable<ProductImage> images
    )
    {
        var uploadFolder = GetUploadFolder();
        var fullUploadFolder = Path.GetFullPath(uploadFolder)
            .TrimEnd(
                Path.DirectorySeparatorChar,
                Path.AltDirectorySeparatorChar
            );

        foreach (var image in images)
        {
            if (
                string.IsNullOrWhiteSpace(image.Url) ||
                !image.Url.StartsWith(
                    "/uploads/products/",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }

            var fileName = Path.GetFileName(image.Url);

            if (string.IsNullOrWhiteSpace(fileName))
            {
                continue;
            }

            var filePath = Path.GetFullPath(
                Path.Combine(uploadFolder, fileName)
            );

            if (
                !filePath.StartsWith(
                    fullUploadFolder,
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }

            try
            {
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }
            catch
            {
                // Không làm fail request nếu file vật lý đang bị khóa.
            }
        }
    }

    private static List<ProductImage> NormalizeImages(
        IEnumerable<ProductImage>? images
    )
    {
        var ordered = (images ?? Enumerable.Empty<ProductImage>())
            .Where(x => !string.IsNullOrWhiteSpace(x.Url))
            .OrderBy(x => x.SortOrder <= 0 ? int.MaxValue : x.SortOrder)
            .ToList();

        var selectedMainIndex = ordered.FindIndex(x => x.IsMain);

        if (selectedMainIndex < 0 && ordered.Count > 0)
        {
            selectedMainIndex = 0;
        }

        for (var i = 0; i < ordered.Count; i++)
        {
            ordered[i].SortOrder = i + 1;
            ordered[i].IsMain = i == selectedMainIndex;

            if (string.IsNullOrWhiteSpace(ordered[i].Alt))
            {
                ordered[i].Alt = string.Empty;
            }

            if (string.IsNullOrWhiteSpace(ordered[i].FileName))
            {
                ordered[i].FileName = Path.GetFileName(ordered[i].Url);
            }
        }

        return ordered;
    }

    private static bool IsAllowedImage(IFormFile file)
    {
        if (file.Length <= 0)
        {
            return false;
        }

        var allowedExtensions = new HashSet<string>(
            StringComparer.OrdinalIgnoreCase
        )
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif"
        };

        var extension = Path.GetExtension(file.FileName);
        var contentType = file.ContentType ?? string.Empty;

        return
            allowedExtensions.Contains(extension) &&
            contentType.StartsWith(
                "image/",
                StringComparison.OrdinalIgnoreCase
            );
    }
}

public class UpdateProductImagesRequest
{
    public List<ProductImage> Images { get; set; } = new();
}
