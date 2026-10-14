using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace WebKingJades.Features.News.Infrastructure;

public static partial class SlugHelper
{
    public static string Generate(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "news";
        }

        var normalized = value.Trim().ToLowerInvariant()
            .Replace('đ', 'd')
            .Replace('Đ', 'd')
            .Normalize(NormalizationForm.FormD);

        var builder = new StringBuilder();

        foreach (var c in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);

            if (category != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(c);
            }
        }

        var noMarks = builder.ToString().Normalize(NormalizationForm.FormC);
        var slug = InvalidSlugCharsRegex().Replace(noMarks, "-");
        slug = DuplicateDashRegex().Replace(slug, "-");

        return slug.Trim('-');
    }

    [GeneratedRegex(@"[^a-z0-9]+", RegexOptions.Compiled)]
    private static partial Regex InvalidSlugCharsRegex();

    [GeneratedRegex(@"-{2,}", RegexOptions.Compiled)]
    private static partial Regex DuplicateDashRegex();
}
