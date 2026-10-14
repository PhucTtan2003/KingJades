namespace WebKingJades.Features.News.Models;

public sealed class NewsTypography
{
    // King Jades editorial defaults.
    public string TitleFont { get; set; } = "Lora";
    public string HeadingFont { get; set; } = "Lora";
    public string BodyFont { get; set; } = "SVN-Gilroy";

    public decimal LetterSpacing { get; set; } = 0.01m;
    public decimal LineHeight { get; set; } = 1.8m;
}
