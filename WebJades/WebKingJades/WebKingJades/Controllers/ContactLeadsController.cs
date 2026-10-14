using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using WebKingJades.Dtos;
using WebKingJades.Models;
using WebKingJades.Models.Dtos;
using WebKingJades.Services;

namespace WebKingJades.Controllers;

[ApiController]
public class ContactLeadsController : ControllerBase
{
    private readonly ContactLeadService _contactLeadService;
    private readonly ILogger<ContactLeadsController> _logger;

    public ContactLeadsController(
        ContactLeadService contactLeadService,
        ILogger<ContactLeadsController> logger)
    {
        _contactLeadService = contactLeadService;
        _logger = logger;
    }

    // =====================================
    // PUBLIC - GỬI LIÊN HỆ
    // =====================================
    [AllowAnonymous]
    [EnableRateLimiting("ContactLead")]
    [HttpPost("api/contact-leads")]
    public async Task<IActionResult> CreateContactLead(
        [FromBody] CreateContactLeadRequest? request)
    {
        if (request == null)
        {
            return BadRequest(new
            {
                success = false,
                message = "Dữ liệu gửi lên không hợp lệ."
            });
        }

        var fullName = request.FullName?.Trim() ?? "";
        var phone = request.Phone?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(fullName))
        {
            return BadRequest(new
            {
                success = false,
                field = "fullName",
                message = "Vui lòng nhập họ tên."
            });
        }

        if (string.IsNullOrWhiteSpace(phone))
        {
            return BadRequest(new
            {
                success = false,
                field = "phone",
                message = "Vui lòng nhập số điện thoại."
            });
        }

        var lead = new ContactLead
        {
            FullName = fullName,
            Phone = phone,
            Email = request.Email?.Trim() ?? "",
            ProductId = request.ProductId?.Trim() ?? "",
            ProductName = request.ProductName?.Trim() ?? "",
            ProductSlug = request.ProductSlug?.Trim() ?? "",
            Need = request.Need?.Trim() ?? "",
            Message = request.Message?.Trim() ?? "",

            Source = string.IsNullOrWhiteSpace(request.Source)
                ? "contact_page"
                : request.Source.Trim(),

            IpAddress =
                HttpContext.Connection.RemoteIpAddress?.ToString()
                ?? "",

            UserAgent =
                Request.Headers["User-Agent"].ToString()
        };

        try
        {
            await _contactLeadService.CreateAsync(lead);

            // Không trả lại họ tên, SĐT, email hay object lead.
            return StatusCode(
                StatusCodes.Status201Created,
                new
                {
                    success = true,
                    message =
                        "Gửi thông tin liên hệ thành công. " +
                        "King Jades sẽ liên hệ lại sớm."
                }
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Không thể tạo contact lead."
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Không thể lưu thông tin liên hệ."
                }
            );
        }
    }

    // =====================================
    // ADMIN - DANH SÁCH LEADS
    // =====================================
    [Authorize(Roles = "admin,staff")]
    [HttpGet("api/admin/contact-leads")]
    public async Task<IActionResult> GetAdminContactLeads(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null)
    {
        try
        {
            var result =
                await _contactLeadService.GetAdminListAsync(
                    skip,
                    take,
                    status,
                    search,
                    fromUtc,
                    toUtc
                );

            return Ok(new
            {
                leads = result.Leads,
                total = result.Total,
                skip,
                take
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Không thể tải danh sách contact leads."
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Không tải được danh sách liên hệ."
                }
            );
        }
    }

    // =====================================
    // ADMIN - TÌM ĐÚNG LEAD THEO ID
    // =====================================
    [Authorize(Roles = "admin,staff")]
    [HttpGet("api/admin/contact-leads/{id}")]
    public async Task<IActionResult> GetAdminLeadById(
        string id,
        CancellationToken cancellationToken)
    {
        var lead = await _contactLeadService.GetByIdAsync(
            id,
            cancellationToken
        );

        if (lead == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy liên hệ này."
            });
        }

        return Ok(lead);
    }

    // =====================================
    // ADMIN - CẬP NHẬT TRẠNG THÁI
    // =====================================
    [Authorize(Roles = "admin,staff")]
    [HttpPatch("api/admin/contact-leads/{id}/status")]
    public async Task<IActionResult> UpdateContactLeadStatus(
        string id,
        [FromBody] UpdateContactLeadStatusRequest request)
    {
        try
        {
            var handledBy =
                User.FindFirstValue(ClaimTypes.Name) ??
                User.FindFirstValue(ClaimTypes.Email) ??
                "system";

            var updatedLead =
                await _contactLeadService.UpdateStatusAsync(
                    id,
                    request.Status,
                    request.InternalNote,
                    handledBy
                );

            if (updatedLead == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy lead liên hệ."
                });
            }

            return Ok(new
            {
                message = "Cập nhật trạng thái liên hệ thành công.",
                lead = updatedLead
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }
}
