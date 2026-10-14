using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebKingJades.Models;


public class Product
{

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }


    public string Name { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public string Sku { get; set; } = string.Empty;



    public string CategoryName { get; set; } = string.Empty;



    public decimal Price { get; set; }

    public decimal SalePrice { get; set; }



    public string ShortDescription { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;



    // ==============================
    // IMAGE + IMAGE SEO
    // ==============================

    public List<ProductImage> Images { get; set; } = new();



    // ==============================
    // SPECIFICATIONS
    // ==============================

    public List<ProductSpecification> Specifications { get; set; } = new();



    // ==============================
    // SEO RANK MATH STYLE
    // ==============================

    public ProductSeo Seo { get; set; } = new();



    // ==============================
    // TYPOGRAPHY
    // ==============================

    public ProductTypography Typography { get; set; }
        = new();



    public ProductTextStyle TextStyle { get; set; }
        = new();



    public List<string> Tags { get; set; } = new();



    public ProductTagging ProductTagging { get; set; }
        = new();



    public ProductVisibility Visibility { get; set; }
        = new();



    public string ParentCategoryId { get; set; } = string.Empty;

    public string ParentCategoryName { get; set; } = string.Empty;


    public string CategoryId { get; set; } = string.Empty;



    public string Status { get; set; }
        = "active";



    // Publish

    public string PublishStatus { get; set; }
        = "Published";


    public DateTime? PublishAtUtc { get; set; }


    public DateTime? PublishedAtUtc { get; set; }



    public DateTime CreatedAtUtc { get; set; }
        = DateTime.UtcNow;


    public DateTime UpdatedAtUtc { get; set; }
        = DateTime.UtcNow;

}

public class ProductImage
{

    public string Url { get; set; } = string.Empty;


    public string FileName { get; set; } = string.Empty;



    // SEO IMAGE

    // Google Image SEO
    public string Alt { get; set; }
        = string.Empty;


    // title attribute
    public string Title { get; set; }
        = string.Empty;


    // mô tả hình ảnh
    public string Description { get; set; }
        = string.Empty;


    // chú thích ảnh
    public string Caption { get; set; }
        = string.Empty;



    public bool IsMain { get; set; }


    public int SortOrder { get; set; }

}

public class ProductSpecification
{
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class ProductSeo
{


    // SEO Title

    public string Title { get; set; }
        = string.Empty;



    // Meta Description

    public string Description { get; set; }
        = string.Empty;



    // Rank Math Focus Keyword

    public string FocusKeyword { get; set; }
        = string.Empty;



    // Related keywords

    public List<string> Keywords { get; set; }
        = new();



    // Canonical

    public string CanonicalUrl { get; set; }
        = string.Empty;



    // index / noindex

    public string Robots { get; set; }
        = "index,follow";



    // Schema

    public string SchemaType { get; set; }
        = "Product";



    // OG Image

    public string OgImage { get; set; }
        = string.Empty;

}

public class ProductTagging
{
    public bool IsFeatured { get; set; }
    public bool IsBestSeller { get; set; }
    public bool IsNewArrival { get; set; }
    public bool IsPromotion { get; set; }
    public List<string> CollectionTags { get; set; } = new();
}

public class ProductVisibility
{
    public bool IsPublished { get; set; } = true;
    public bool ShowOnMenu { get; set; }
}
public class ProductTypography
{

    public string TitleFont { get; set; }
        = "Lora";


    public string DescriptionFont { get; set; }
        = "Gilroy";


    public decimal LetterSpacing { get; set; }
        = 0.02m;


    public decimal LineHeight { get; set; }
        = 1.8m;

}
public class ProductTextStyle
{

    public string HeadingAlign { get; set; }
        = "left";


    public string BodyAlign { get; set; }
        = "left";


    public string HeadingColor { get; set; }
        = "#142543";


    public string BodyColor { get; set; }
        = "#706d65";


    public int HeadingSize { get; set; }
        = 48;


    public int BodySize { get; set; }
        = 16;

}