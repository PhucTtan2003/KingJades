using Microsoft.AspNetCore.Http;

namespace WebKingJades.Models;


public class CreateProductRequest
{

    // ==================================================
    // BASIC INFORMATION
    // ==================================================

    public string Name { get; set; }
        = string.Empty;


    public string CategoryName { get; set; }
        = string.Empty;



    public string? Slug { get; set; }


    public string? Sku { get; set; }



    public decimal Price { get; set; }


    public decimal SalePrice { get; set; }



    public string? ShortDescription { get; set; }


    public string? Description { get; set; }




    // ==================================================
    // PRODUCT SPECIFICATIONS
    // JSON STRING
    // ==================================================

    public string? Specifications { get; set; }
        = "[]";




    // ==================================================
    // SEO - RANK MATH STYLE
    // JSON STRING
    // ==================================================

    public string? Seo { get; set; }
        = "{}";




    // ==================================================
    // TYPOGRAPHY STYLE
    // JSON STRING
    // ==================================================

    public string? Typography { get; set; }
        = "{}";




    // ==================================================
    // TEXT STYLE
    // JSON STRING
    // ==================================================

    public string? TextStyle { get; set; }
        = "{}";




    // ==================================================
    // TAG
    // ==================================================

    public string? Tags { get; set; }
        = "[]";



    public string? ProductTagging { get; set; }
        = "{}";



    public string? Visibility { get; set; }
        = "{}";




    // ==================================================
    // STATUS
    // ==================================================

    public string? Status { get; set; }
        = "active";




    // ==================================================
    // IMAGE UPLOAD
    // ==================================================

    public List<IFormFile>? Images { get; set; }
        = new();




    // ==================================================
    // CATEGORY
    // ==================================================

    public string ParentCategoryId { get; set; }
        = string.Empty;


    public string ParentCategoryName { get; set; }
        = string.Empty;



    public string CategoryId { get; set; }
        = string.Empty;

}