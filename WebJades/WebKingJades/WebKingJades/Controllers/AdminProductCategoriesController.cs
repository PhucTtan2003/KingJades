using Microsoft.AspNetCore.Mvc;
using WebKingJades.Models;
using WebKingJades.Services;

namespace WebKingJades.Controllers;

[ApiController]
[Route("api/admin/product-categories")]
public class AdminProductCategoriesController : ControllerBase
{
    private readonly ProductCategoryService _service;
    private readonly ProductService _productService;

    public AdminProductCategoriesController(
        ProductCategoryService service,
        ProductService productService
    )
    {
        _service = service;
        _productService = productService;
    }

    // ==================================================
    // GET ALL
    // GET /api/admin/product-categories
    // ==================================================

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories =
            await _service.GetAllAsync();

        return Ok(new
        {
            categories
        });
    }

    // ==================================================
    // GET PARENTS
    // ==================================================

    [HttpGet("parents")]
    public async Task<IActionResult> GetParents()
    {
        var categories =
            await _service.GetParentsAsync();

        return Ok(new
        {
            categories
        });
    }

    // ==================================================
    // GET CHILDREN
    //
    // Giữ kiến trúc cũ:
    // Danh mục menu -> Mục sản phẩm.
    //
    // Nhóm sản phẩm KHÔNG phải category level mới.
    // Nó nằm trong MenuGroupId / MenuGroupName.
    // ==================================================

    [HttpGet("{parentId}/children")]
    public async Task<IActionResult> GetChildren(
        string parentId
    )
    {
        if (
            string.IsNullOrWhiteSpace(
                parentId
            )
        )
        {
            return BadRequest(new
            {
                message =
                    "ParentId không hợp lệ."
            });
        }

        var parent =
            await _service
                .GetByIdAsync(
                    parentId
                );

        if (parent == null)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy danh mục chính."
            });
        }

        var categories =
            await _service
                .GetChildrenAsync(
                    parentId
                );

        return Ok(new
        {
            parent,
            categories
        });
    }

    // ==================================================
    // CREATE
    //
    // ParentId = ""
    // => Danh mục menu.
    //
    // ParentId != ""
    // => Mục sản phẩm.
    //
    // MenuGroupId/MenuGroupName chỉ tổ chức UI,
    // KHÔNG tạo thêm tầng ProductCategory.
    // ==================================================

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create(
        [FromForm]
        CreateProductCategoryRequest request
    )
    {
        var name =
            request.Name?.Trim()
            ?? string.Empty;

        var parentId =
            request.ParentId?.Trim()
            ?? string.Empty;

        if (
            string.IsNullOrWhiteSpace(
                name
            )
        )
        {
            return BadRequest(new
            {
                message =
                    "Tên danh mục không được để trống."
            });
        }

        string parentName =
            string.Empty;

        if (
            !string.IsNullOrWhiteSpace(
                parentId
            )
        )
        {
            var parent =
                await _service
                    .GetByIdAsync(
                        parentId
                    );

            if (parent == null)
            {
                return BadRequest(new
                {
                    message =
                        "Danh mục menu không tồn tại."
                });
            }

            /*
             * HARD SAFETY:
             * Vẫn giữ đúng cấu trúc 2 tầng cũ.
             */
            if (
                !string.IsNullOrWhiteSpace(
                    parent.ParentId
                )
            )
            {
                return BadRequest(new
                {
                    message =
                        "Kiến trúc King Jades chỉ lưu 2 tầng category: Danh mục menu → Mục sản phẩm. Nhóm sản phẩm chỉ dùng để trình bày UI."
                });
            }

            parentName =
                parent.Name;
        }

        var existed =
            await _service
                .FindByNameAsync(
                    name,
                    parentId
                );

        if (existed != null)
        {
            return Ok(new
            {
                message =
                    "Danh mục đã tồn tại.",

                existed =
                    true,

                category =
                    existed
            });
        }

        var category =
            new ProductCategory
            {
                Name =
                    name,

                Slug =
                    request.Slug?.Trim()
                    ?? string.Empty,

                ParentId =
                    parentId,

                ParentName =
                    parentName,

                MenuGroupId =
                    string.IsNullOrWhiteSpace(
                        parentId
                    )
                        ? string.Empty
                        : (
                            request
                                .MenuGroupId?
                                .Trim()
                            ?? string.Empty
                        ),

                MenuGroupName =
                    string.IsNullOrWhiteSpace(
                        parentId
                    )
                        ? string.Empty
                        : (
                            request
                                .MenuGroupName?
                                .Trim()
                            ?? string.Empty
                        ),

                SortOrder =
                    request.SortOrder,

                IsActive =
                    request.IsActive,

                ShowOnMenu =
                    request.ShowOnMenu,

                CreatedAtUtc =
                    DateTime.UtcNow,

                UpdatedAtUtc =
                    DateTime.UtcNow
            };

        var created =
            await _service
                .CreateAsync(
                    category
                );

        return StatusCode(
            StatusCodes.Status201Created,
            new
            {
                message =
                    string.IsNullOrWhiteSpace(
                        parentId
                    )
                        ? "Tạo danh mục menu thành công."
                        : "Tạo mục sản phẩm thành công.",

                existed =
                    false,

                category =
                    created
            }
        );
    }

    // ==================================================
    // UPDATE PRESENTATION ONLY
    //
    // KHÔNG đổi Name / Slug / ParentId.
    // Vì các field đó liên quan tới dữ liệu Product cũ
    // và URL/filter hiện tại.
    // ==================================================

    [HttpPut("{id}/presentation")]
    public async Task<IActionResult>
        UpdatePresentation(
            string id,
            [FromBody]
            UpdateProductCategoryPresentationRequest
                request
        )
    {
        var category =
            await _service
                .GetByIdAsync(id);

        if (category == null)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy danh mục."
            });
        }

        var menuGroupId =
            string.IsNullOrWhiteSpace(
                category.ParentId
            )
                ? string.Empty
                : (
                    request
                        .MenuGroupId?
                        .Trim()
                    ?? string.Empty
                );

        var menuGroupName =
            string.IsNullOrWhiteSpace(
                category.ParentId
            )
                ? string.Empty
                : (
                    request
                        .MenuGroupName?
                        .Trim()
                    ?? string.Empty
                );

        var updated =
            await _service
                .UpdatePresentationAsync(
                    id,
                    request.SortOrder,
                    request.IsActive,
                    request.ShowOnMenu,
                    menuGroupId,
                    menuGroupName
                );

        if (!updated)
        {
            return BadRequest(new
            {
                message =
                    "Không thể cập nhật danh mục."
            });
        }

        var saved =
            await _service
                .GetByIdAsync(id);

        return Ok(new
        {
            message =
                "Cập nhật hiển thị danh mục thành công.",

            category =
                saved
        });
    }

    // ==================================================
    // DELETE
    //
    // Giữ toàn bộ safety cũ:
    // - Parent có child => không xóa.
    // - Parent có Product => không xóa.
    // - Leaf có Product => không xóa.
    // ==================================================

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(
        string id
    )
    {
        if (
            string.IsNullOrWhiteSpace(
                id
            )
        )
        {
            return BadRequest(new
            {
                message =
                    "Id danh mục không hợp lệ."
            });
        }

        var category =
            await _service
                .GetByIdAsync(id);

        if (category == null)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy danh mục."
            });
        }

        if (
            string.IsNullOrWhiteSpace(
                category.ParentId
            )
        )
        {
            var childCount =
                await _service
                    .CountChildrenAsync(id);

            if (childCount > 0)
            {
                return Conflict(new
                {
                    message =
                        $"Không thể xóa \"{category.Name}\" vì vẫn còn {childCount} mục sản phẩm bên trong."
                });
            }

            var productCount =
                await _productService
                    .CountByParentCategoryAsync(
                        id
                    );

            if (productCount > 0)
            {
                return Conflict(new
                {
                    message =
                        $"Không thể xóa \"{category.Name}\" vì đang có {productCount} sản phẩm thuộc danh mục này."
                });
            }
        }
        else
        {
            var productCount =
                await _productService
                    .CountByCategoryAsync(
                        id
                    );

            if (productCount > 0)
            {
                return Conflict(new
                {
                    message =
                        $"Không thể xóa \"{category.Name}\" vì đang có {productCount} sản phẩm trong mục này."
                });
            }
        }

        var deleted =
            await _service
                .DeleteAsync(id);

        if (!deleted)
        {
            return BadRequest(new
            {
                message =
                    "Không thể xóa danh mục."
            });
        }

        return Ok(new
        {
            message =
                string.IsNullOrWhiteSpace(
                    category.ParentId
                )
                    ? "Xóa danh mục menu thành công."
                    : "Xóa mục sản phẩm thành công."
        });
    }
}

public class CreateProductCategoryRequest
{
    public string Name { get; set; } =
        string.Empty;

    /*
     * Có thể để trống để backend tự tạo.
     * Chỉ áp dụng cho category MỚI.
     */
    public string? Slug { get; set; }

    public string? ParentId { get; set; }

    /*
     * Hai field mới chỉ dùng cho UI/menu.
     * Không ảnh hưởng Product document.
     */
    public string? MenuGroupId { get; set; }

    public string? MenuGroupName { get; set; }

    public int SortOrder { get; set; } = 0;

    public bool IsActive { get; set; } =
        true;

    public bool ShowOnMenu { get; set; } =
        true;
}

public class UpdateProductCategoryPresentationRequest
{
    public string? MenuGroupId { get; set; }

    public string? MenuGroupName { get; set; }

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } =
        true;

    public bool ShowOnMenu { get; set; } =
        true;
}
