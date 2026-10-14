namespace WebKingJades.Models;

public class ProductListItemDto
{
    public string? Id { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;

    public decimal Price { get; set; }
    public decimal SalePrice { get; set; }

    public List<ProductImage> Images { get; set; } = new();

    public ProductVisibility Visibility { get; set; } = new();

    public string Status { get; set; } = "active";

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public string ParentCategoryId { get; set; } = string.Empty;

    public string ParentCategoryName { get; set; } = string.Empty;

    public string CategoryId { get; set; } = string.Empty;

    
}