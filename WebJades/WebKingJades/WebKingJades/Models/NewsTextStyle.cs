namespace WebKingJades.Features.News.Models;

public sealed class NewsTextStyle
{
    public int TitleSize { get; set; } = 56;
    public int HeadingSize { get; set; } = 32;
    public int BodySize { get; set; } = 16;

    public string TitleColor { get; set; } = "#142543";
    public string HeadingColor { get; set; } = "#142543";
    public string BodyColor { get; set; } = "#5f655f";
    public string LinkColor { get; set; } = "#0b5d48";

    public string TitleAlign { get; set; } = "center";
    public string BodyAlign { get; set; } = "left";

    // Keeps long-form blog content readable.
    public int ContentWidth { get; set; } = 800;
}
