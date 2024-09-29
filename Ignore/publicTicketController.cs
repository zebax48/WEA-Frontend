using API_Client;
using EllipticCurve.Utils;
using EventsRegistrationApi.DataContext;
using EventsRegistrationApi.Entities;
using EventsRegistrationApi.Lib.Domain;
using EventsRegistrationApi.Lib.EmailHandler;
using EventsRegistrationApi.Lib.Services;
using EventsRegistrationApi.Lib.Utils;
using EventsRegistrationApi.Lib.ViewModels;
using EventsRegistrationApi.Migrations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QRCoder;
using SendGrid.Helpers.Mail;
using Stripe;
using System.Collections;
using System.Drawing;
using System.Net;
using System.Text;
using System.Xml.Linq;
using static QRCoder.PayloadGenerator;
using Attachment = System.Net.Mail.Attachment;

namespace EventsRegistrationApi.Controllers.Public
{
    [Route("api/[controller]")]
    [ApiController]
    public class publicTicketController : ControllerBase
    {
        private readonly ILogger<publicTicketController> _logger;
        private ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly CustomViewRendererService _viewService;
        public publicTicketController(ApplicationDbContext context, IConfiguration config, CustomViewRendererService viewService, ILogger<publicTicketController> logger)
        {
            _context = context;
            _config = config;
            _viewService = viewService;
            _logger = logger;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult> Get(Guid id)
        {
            var result = await _context.EventTickets.Include(z => z.Event).FirstOrDefaultAsync(x => x.Id == id);
            if (result == null)
                return NotFound(new
                {
                    eventTicketId = id
                });

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] PublicTicketPurchaseVM item)
        {
            try
            {
                var duplicate = _context.EventTickets.FirstOrDefault(x => x.EventId == item.EventId && x.Email == item.Email && x.Phone == item.CompanyPhone && x.FirstName == item.FirstName && x.LastName == item.LastName);
                if (duplicate != null)
                    return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon", Description = "Duplicate person phone and email for this event." } } });

                var ev = await _context.Events.FirstOrDefaultAsync(x => x.Id == item.EventId);
                if (ev == null)
                    return NotFound(new { eventId = item.EventId });
                var coupon = await _context.EventTicketCoupons.FirstOrDefaultAsync(x => x.Id == item.CouponId);
                string allowedRooms = string.Empty;
                string allowedDates = string.Empty;

                if (item.PaymentMethod == NPaymentMethod.Coupon && coupon != null)
                {
                    var used = _context.EventTickets.Where(x => x.PaymentRecordId == item.PayCoupon && x.TicketStatus == NTicketStatus.Active).ToList();

                    if (coupon == null || coupon.Expiration < DateTime.Now || coupon.Status == NCouponStatus.Used || coupon.Status == NCouponStatus.Expired || coupon.Status == NCouponStatus.Deleted || (coupon.Event != null && coupon.Event.Id != item.EventId) || (coupon.Status == NCouponStatus.PartialUsed && coupon.Usage <= used.Count))
                        return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon", Description = "Coupon Code is not valid at this moment." } } });

                    var cDates = coupon.Dates?.Split(',').ToList() ?? new List<string>();
                    var pDates = item.Dates?.Split(',').ToList() ?? new List<string>(); ;
                    if (cDates == null || cDates.Count == 0 || pDates == null || pDates.Count == 0)
                        return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-dates", Description = "Coupon Code is not valid for Dates." } } });

                    foreach (var d in pDates)
                    {
                        if (!cDates.Contains(d))
                            return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-dates", Description = "Coupon Code is not valid for some Dates selected." } } });
                    }

                    var cRooms = coupon.Rooms?.Split(',').ToList() ?? new List<string>();
                    var pRooms = item.Rooms?.Split(',').ToList() ?? new List<string>(); ;
                    if (cRooms == null || cRooms.Count == 0 || pRooms == null || pRooms.Count == 0)
                        return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-rooms", Description = "Coupon Code is not valid for Rooms." } } });

                    foreach (var d in pRooms)
                    {
                        if (!cRooms.Contains(d))
                            return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-rooms", Description = "Coupon Code is not valid for some Rooms selected." } } });
                    }
                    var eventRooms = ev.Rooms?.Split(',').ToList() ?? new List<string>();
                    var couponRooms = coupon.Rooms?.Split(",").ToList() ?? new List<string>();
                    var ticketRooms = item.Rooms?.Split(",").ToList() ?? new List<string>();

                    foreach (var room in eventRooms)
                    {
                        if (couponRooms.Contains(room) && ticketRooms.Contains(room))
                            allowedRooms = allowedRooms + (string.IsNullOrEmpty(allowedRooms) ? room : "," + room);
                    }

                    var eventDates = getBetweenDates(ev.EventStartDate, ev.EventEndDate);
                    var couponDates = coupon.Dates?.Split(',').ToList() ?? new List<string>();
                    var ticketDates = item.Dates?.Split(',').ToList() ?? new List<string>();

                    foreach (var date in eventDates.Split(','))
                    {
                        if (couponDates.Contains(date) && ticketDates.Contains(date))
                            allowedDates = allowedDates + (string.IsNullOrEmpty(allowedDates) ? date : "," + date);
                    }
                }
                else
                {
                    allowedRooms = item.Rooms;
                    allowedDates = item.Dates;
                }

                var ticketId = Guid.NewGuid();
                var prodUrl = _config["EnvironmentSettings:productUrl"] ?? "https://events.benattechnologie.net";
                var expositorCompanyadded = !string.IsNullOrEmpty(item.Company) ? $"&company={item.Company}" : "";

                //changed because Device QR Reader cannot read - characters
                //var qrCodeText = $"{prodUrl}/Tickets/Details/{noDashTicketId}?eventId={item.EventId}{expositorCompanyadded}";
                var noDashTicketId = ticketId.ToString().Replace("-", "");
                var qrCodeText = $"{prodUrl}/Tickets/Details/{noDashTicketId}";

                Url generator = new Url(qrCodeText);
                QRCodeGenerator qrGenerator = new QRCodeGenerator();
                QRCodeData qrCodeData = qrGenerator.CreateQrCode(generator.ToString(), QRCodeGenerator.ECCLevel.Q);
                BitmapByteQRCode qrCode = new BitmapByteQRCode(qrCodeData);
                byte[] qrCodeAsBitmapByteArr = qrCode.GetGraphic(5);
                string base64String = Convert.ToBase64String(qrCodeAsBitmapByteArr, 0, qrCodeAsBitmapByteArr.Length);
                var Credentials = !string.IsNullOrEmpty(item.Picture) ? (System.Convert.FromBase64String(item.Picture.Split(',')[1])) : null;

                var expositorCouponType = _context.Expositor.FirstOrDefault(x => x.StaffCouponCode == item.PayCoupon || x.CourtesyCouponCode == item.PayCoupon);

                var ticket = new EventTicket()
                {
                    Id = ticketId,
                    EventId = item.EventId,
                    CreatedAt = DateTime.Now,
                    CreatedBy = "public",
                    CompanyAddress = item.CompanyAddress,
                    CompanyEmail = item.CompanyEmail,
                    CompanyName = item.CompanyName,
                    CompanyPhone = item.CompanyPhone,
                    Description = coupon?.Description,
                    Title = ev.Name,
                    Event = ev,
                    QRCode = qrCodeAsBitmapByteArr,
                    FirstName = item.FirstName,
                    LastName = item.LastName,
                    Email = item.Email,
                    Credentials = Credentials != null ? ImageUtils.ResizeImageBytes(Credentials, 1440, 1920, System.Drawing.Drawing2D.InterpolationMode.Default) : null,
                    TicketStatus = (item.PaymentMethod == NPaymentMethod.Zelle || item.PaymentMethod == NPaymentMethod.CashApp || item.PaymentMethod == NPaymentMethod.NatCash || item.PaymentMethod == NPaymentMethod.Moncash || item.PaymentMethod == NPaymentMethod.Pse) ? NTicketStatus.Inactive : NTicketStatus.Active,
                    Rooms = allowedRooms,
                    Dates = allowedDates,
                    PaymentRecordId = item.PayCoupon,
                    PaymentType = expositorCouponType != null ? (expositorCouponType.CourtesyCouponCode == item.PayCoupon ? "VIP" : "Staff") : item.PaymentMethod,
                    ZelleAccount = item.ZelleAccount,
                    ZelleAmount = item.ZelleAmount,
                    ZelleName = item.ZelleName,
                    GroupId = item.GroupId,
                    GroupQty = item.GroupQty,
                    ParkingMethod = item.ParkingMethod,
                    CashAppAccount = item.CashAppAccount,
                    CashAppName = item.CashAppName,
                    CashAppAmount = item.CashAppAmount,
                    MoncashAccount = item.MoncashAccount,
                    MoncashAmount = item.MoncashAmount,
                    MoncashName = item.MoncashName,
                    NatCashAccount = item.NatCashAccount,
                    NatCashAmount = item.NatCashAmount,
                    NatCashName = item.NatCashName,
                    PseAccount = item.PseAccount,
                    PseAmount = item.PseAmount,
                    PseName = item.PseName,
                    GroupMain = item.GroupMain,
                    TotalAmount = item.TotalAmount,
                    TicketPrice = item.TicketPrice,
                    PriceMethod = item.PriceMethod,
                    CouponId = item.CouponId,
                };

                await _context.EventTickets.AddAsync(ticket);

                if (coupon != null)
                {
                    coupon.Status = NCouponStatus.PartialUsed;
                    coupon.Used = coupon.Used + 1;
                }

                if (item.PriceMethod == NPriceMethod.Early)
                    ev.EarlyBirdTotalTickets = ev.EarlyBirdTotalTickets - 1;
                else if (item.PriceMethod == NPriceMethod.Regular)
                    ev.RegularTotalTickets = ev.RegularTotalTickets - 1;
                else if (item.PriceMethod == NPriceMethod.Last)
                    ev.LastMinuteTotalTickets = ev.LastMinuteTotalTickets - 1;

                await _context.SaveChangesAsync();
                var emailService = new EmailService(_config);
                var templatePath = "~/EmailTemplates/ticketSuccess.cshtml";
                decimal price = Convert.ToDecimal(item.TicketPrice);
                var couponDiscount = await _context.EventTicketCoupons.FirstOrDefaultAsync(x => x.Id == item.CouponId);
                decimal totalPrice = Convert.ToDecimal(item.TotalAmount);
                decimal parking = item.ParkingMethod == NParkingMethod.Free ? 0 : (item.ParkingMethod == NParkingMethod.Standard ? Convert.ToDecimal(Math.Round(ev.StandardParkingPrice, 2)) : Convert.ToDecimal(Math.Round(ev.VIPParkingPrice, 2)));
                string htmlEmailBody = await _viewService.RenderViewToStringAsync(ControllerContext, templatePath, (ev, ticket, prodUrl, price, parking, totalPrice, couponDiscount));
                Attachment att = new Attachment(new MemoryStream(qrCodeAsBitmapByteArr), "qrcode.jpg");
                Attachment? att2 = Credentials != null ? new Attachment(new MemoryStream(Credentials), "picture.jpg") : null;
                var emails = item.Email.Split(',');
                var attachments = new List<Attachment>();
                attachments.Add(att);
                if (att2 != null)
                    attachments.Add(att2);

                if (prodUrl == "https://events.benattechnologie.net")
                {
                    if (item.PaymentMethod == NPaymentMethod.Coupon || item.PaymentMethod == NPaymentMethod.Card)
                        emailService.SendEmail(emails.Append("dhamict@gmail.com").ToArray(), $"{ev.Name} Registration Completed", htmlEmailBody, new string[] { "" }, attachments.ToArray());
                    else if (item.PaymentMethod == NPaymentMethod.Zelle || item.PaymentMethod == NPaymentMethod.CashApp || item.PaymentMethod == NPaymentMethod.Moncash || item.PaymentMethod == NPaymentMethod.NatCash || item.PaymentMethod == NPaymentMethod.Pse)
                        emailService.SendEmail(emails.Append("dhamict@gmail.com").ToArray(), $"{ev.Name} Registration In Process", $"Hello {item.FirstName} {item.LastName}, We are verifying your payment and will send you an email with the ticket details once it's confirmed.\r\nThank you.", new string[] { "" }, null);
                }
                else
                {
                    if (item.PaymentMethod == NPaymentMethod.Coupon || item.PaymentMethod == NPaymentMethod.Card)
                        emailService.SendEmail(emails, $"{ev.Name} Registration Completed", htmlEmailBody, new string[] { "" }, attachments.ToArray());
                    else if (item.PaymentMethod == NPaymentMethod.Zelle || item.PaymentMethod == NPaymentMethod.CashApp || item.PaymentMethod == NPaymentMethod.Moncash || item.PaymentMethod == NPaymentMethod.NatCash || item.PaymentMethod == NPaymentMethod.Pse)
                        emailService.SendEmail(emails, $"{ev.Name} Registration In Process", $"Hello {item.FirstName} {item.LastName}, We are verifying your payment and will send you an email with the ticket details once it's confirmed.\r\nThank you.", new string[] { "" }, null);
                }

                ApiClient apiClient = new ApiClient();
                apiClient.ApiURL = "https://new-api.biopayday.net/api/public";
                //apiClient.ApiURL = "http://localhost:8088/api/public";
                if (!string.IsNullOrEmpty(await apiClient.BasicAuthenticateAsync(ticket.Event.CompanyCode ?? "50034", "support", "abcd-1234")))
                {
                    var result = await apiClient.CreateUserAsync(new API_Client.Models.User() { UserID = ticket.InternalId.ToString(), FirstName = $"{ticket.FirstName} {ticket.LastName} ", LastName = "Table to be assigned", ExtID1 = qrCodeText });
                    if (!string.IsNullOrEmpty(item.Picture))
                    {
                        var faceResult = await apiClient.CreateUserFaceAsync(new API_Client.Models.UserFaceVM() { UserId = ticket.InternalId.ToString(), Picture = Convert.ToBase64String(Credentials), Template = Convert.ToBase64String(Credentials) });
                    }
                }

                return Ok(ticket);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, ex.ToString());
                return Problem(ex.Message);
            }
        }

        [HttpPost]
        [Route("publicTicketBulk")]
        public async Task<IActionResult> PublicTicketBulk([FromBody] List<PublicTicketPurchaseVM> items)
        {
            try
            {
                //var duplicate = _context.EventTickets.FirstOrDefault(x => x.EventId == item.EventId && x.Email == item.Email && x.Phone == item.CompanyPhone && x.FirstName == item.FirstName && x.LastName == item.LastName);
                //if (duplicate != null)
                //	return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon", Description = "Duplicate person phone and email for this event." } } });

                var ev = await _context.Events.FirstOrDefaultAsync(x => x.Id == items.First().EventId);

                if (ev == null)
                    return NotFound(new { eventId = items.First().EventId });

                var prodUrl = _config["EnvironmentSettings:productUrl"] ?? "https://events.benattechnologie.net";
                List<EventTicket> eventTickets = new List<EventTicket>();
                Dictionary<string, byte[]> eventQrs = new Dictionary<string, byte[]>();
                EventTicketCoupon coupon = null;
                foreach (var item in items)
                {

                    coupon = await _context.EventTicketCoupons.FirstOrDefaultAsync(x => x.Id == items.First().CouponId);
                    string allowedRooms = string.Empty;
                    string allowedDates = string.Empty;

                    if (item.PaymentMethod == NPaymentMethod.Coupon && coupon != null)
                    {
                        var used = _context.EventTickets.Where(x => x.PaymentRecordId == item.PayCoupon && x.TicketStatus == NTicketStatus.Active).ToList();

                        if (coupon == null || coupon.Expiration < DateTime.Now || coupon.Status == NCouponStatus.Used || coupon.Status == NCouponStatus.Expired || coupon.Status == NCouponStatus.Deleted || (coupon.Event != null && coupon.Event.Id != item.EventId) || (coupon.Status == NCouponStatus.PartialUsed && coupon.Usage <= used.Count))
                            return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon", Description = "Coupon Code is not valid at this moment." } } });

                        var cDates = coupon.Dates?.Split(',').ToList() ?? new List<string>();
                        var pDates = item.Dates?.Split(',').ToList() ?? new List<string>(); ;
                        if (cDates == null || cDates.Count == 0 || pDates == null || pDates.Count == 0)
                            return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-dates", Description = "Coupon Code is not valid for Dates." } } });

                        foreach (var d in pDates)
                        {
                            if (!cDates.Contains(d))
                                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-dates", Description = "Coupon Code is not valid for some Dates selected." } } });
                        }

                        var cRooms = coupon.Rooms?.Split(',').ToList() ?? new List<string>();
                        var pRooms = item.Rooms?.Split(',').ToList() ?? new List<string>(); ;
                        if (cRooms == null || cRooms.Count == 0 || pRooms == null || pRooms.Count == 0)
                            return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-rooms", Description = "Coupon Code is not valid for Rooms." } } });

                        foreach (var d in pRooms)
                        {
                            if (!cRooms.Contains(d))
                                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-rooms", Description = "Coupon Code is not valid for some Rooms selected." } } });
                        }
                        var eventRooms = ev.Rooms?.Split(',').ToList() ?? new List<string>();
                        var couponRooms = coupon.Rooms?.Split(",").ToList() ?? new List<string>();
                        var ticketRooms = item.Rooms?.Split(",").ToList() ?? new List<string>();

                        foreach (var room in eventRooms)
                        {
                            if (couponRooms.Contains(room) && ticketRooms.Contains(room))
                                allowedRooms = allowedRooms + (string.IsNullOrEmpty(allowedRooms) ? room : "," + room);
                        }

                        var eventDates = getBetweenDates(ev.EventStartDate, ev.EventEndDate);
                        var couponDates = coupon.Dates?.Split(',').ToList() ?? new List<string>();
                        var ticketDates = item.Dates?.Split(',').ToList() ?? new List<string>();

                        foreach (var date in eventDates.Split(','))
                        {
                            if (couponDates.Contains(date) && ticketDates.Contains(date))
                                allowedDates = allowedDates + (string.IsNullOrEmpty(allowedDates) ? date : "," + date);
                        }
                    }
                    else if (item.PaymentMethod == NPaymentMethod.Zelle && !string.IsNullOrEmpty(item.ZelleName) && !string.IsNullOrEmpty(item.ZelleAmount) && !string.IsNullOrEmpty(item.ZelleAccount))
                    {
                        allowedRooms = item.Rooms;
                        allowedDates = item.Dates;
                    }
                    else
                    {
                        allowedRooms = item.Rooms;
                        allowedDates = item.Dates;
                    }

                    var ticketId = Guid.NewGuid();

                    //changed because Device QR Reader cannot read - characters
                    //var qrCodeText = $"{prodUrl}/Tickets/Details/{ticketId}?eventId={item.EventId}";
                    var noDashTicketId = ticketId.ToString().Replace("-", "");
                    var qrCodeText = $"{prodUrl}/Tickets/Details/{noDashTicketId}";

                    Url generator = new Url(qrCodeText);
                    QRCodeGenerator qrGenerator = new QRCodeGenerator();
                    QRCodeData qrCodeData = qrGenerator.CreateQrCode(generator.ToString(), QRCodeGenerator.ECCLevel.Q);
                    BitmapByteQRCode qrCode = new BitmapByteQRCode(qrCodeData);
                    byte[] qrCodeAsBitmapByteArr = qrCode.GetGraphic(5);
                    //string base64String = Convert.ToBase64String(qrCodeAsBitmapByteArr, 0, qrCodeAsBitmapByteArr.Length);
                    var Credentials = !string.IsNullOrEmpty(item.Picture) ? (System.Convert.FromBase64String(item.Picture.Split(',')[1])) : null;

                    var expositorCouponType = _context.Expositor.FirstOrDefault(x => x.StaffCouponCode == item.PayCoupon || x.CourtesyCouponCode == item.PayCoupon);

                    var ticket = new EventTicket()
                    {
                        Id = ticketId,
                        EventId = item.EventId,
                        CreatedAt = DateTime.Now,
                        CreatedBy = "public",
                        CompanyAddress = item.CompanyAddress,
                        CompanyEmail = item.CompanyEmail,
                        CompanyName = item.CompanyName,
                        CompanyPhone = item.CompanyPhone,
                        Description = coupon?.Description,
                        Title = ev.Name,
                        Event = ev,
                        QRCode = null,
                        FirstName = item.FirstName,
                        LastName = item.LastName,
                        Email = item.Email,
                        Credentials = Credentials != null ? ImageUtils.ResizeImageBytes(Credentials, 1440, 1920, System.Drawing.Drawing2D.InterpolationMode.Default) : null,
                        TicketStatus = (item.PaymentMethod == NPaymentMethod.Zelle || item.PaymentMethod == NPaymentMethod.CashApp) ? NTicketStatus.Inactive :
                                       (item.PaymentMethod == NPaymentMethod.Coupon && coupon != null && coupon.Percentage == 100) ? NTicketStatus.Active : NTicketStatus.Inactive,

                        Rooms = allowedRooms,
                        Dates = allowedDates,
                        PaymentRecordId = item.PayCoupon,
                        PaymentType = expositorCouponType != null ? (expositorCouponType.CourtesyCouponCode == item.PayCoupon ? "VIP" : "Staff") : item.PaymentMethod,
                        ZelleAccount = item.ZelleAccount,
                        ZelleAmount = item.ZelleAmount,
                        ZelleName = item.ZelleName,
                        GroupId = item.GroupId,
                        GroupQty = item.GroupQty,
                        CashAppAccount = item.CashAppAccount,
                        CashAppName = item.CashAppName,
                        CashAppAmount = item.CashAppAmount,
                        ParkingMethod = item.ParkingMethod,
                        GroupMain = item.GroupMain,
                        TotalAmount = item.TotalAmount,
                        TicketPrice = item.TicketPrice,
                        PriceMethod = item.PriceMethod,
                        CouponId = item.CouponId,
                    };

                    eventQrs.Add(ticketId.ToString(), qrCodeAsBitmapByteArr);
                    eventTickets.Add(ticket);
                    await _context.EventTickets.AddAsync(ticket);

                    if (coupon != null)
                    {
                        coupon.Status = NCouponStatus.PartialUsed;
                        coupon.Used = coupon.Used + 1;
                    }

                    if (item.PriceMethod == NPriceMethod.Early)
                        ev.EarlyBirdTotalTickets = ev.EarlyBirdTotalTickets - 1;
                    else if (item.PriceMethod == NPriceMethod.Regular)
                        ev.RegularTotalTickets = ev.RegularTotalTickets - 1;
                    else if (item.PriceMethod == NPriceMethod.Last)
                        ev.LastMinuteTotalTickets = ev.LastMinuteTotalTickets - 1;
                }

                await _context.SaveChangesAsync();
                var emailService = new EmailService(_config);
                var templatePath = "~/EmailTemplates/ticketSuccessBulk.cshtml";
                decimal price = Convert.ToDecimal(items.First().TicketPrice);
                decimal groupQty = Convert.ToDecimal(items.First().GroupQty);
                decimal totalPrice = Convert.ToDecimal(items.FirstOrDefault(x => x.GroupMain == true).TotalAmount);
                decimal parking = items.First().ParkingMethod == NParkingMethod.Free ? 0 : (items.First().ParkingMethod == NParkingMethod.Standard ? Convert.ToDecimal(Math.Round(ev.StandardParkingPrice, 2)) : Convert.ToDecimal(Math.Round(ev.VIPParkingPrice, 2)));

                string htmlEmailBody = await _viewService.RenderViewToStringAsync(ControllerContext, templatePath, (ev, eventTickets, prodUrl, price, parking, totalPrice, groupQty, coupon));

                var attachments = new List<Attachment>();
                foreach (var t in eventQrs)
                {
                    attachments.Add(new Attachment(new MemoryStream(t.Value), $"{t.Key}-QR.jpg"));
                    var ticket = eventTickets.FirstOrDefault(x => x.Id.ToString() == t.Key);
                    if (ticket.Credentials != null)
                        attachments.Add(new Attachment(new MemoryStream(ticket.Credentials), $"{ticket.Id}.jpg"));

                }
                var emails = items.First().Email.Split(',');

                if (prodUrl == "https://events.benattechnologie.net")
                {
                    if (items.First().PaymentMethod == NPaymentMethod.Coupon || items.First().PaymentMethod == NPaymentMethod.Card)
                    {
                        var recipientEmails = emails.Append("dhamict@gmail.com").Distinct().ToArray();  // Eliminar duplicados
                        emailService.SendEmail(recipientEmails, $"{ev.Name} Registration Completed", htmlEmailBody, new string[] { "" }, attachments.ToArray());
                    }
                    else if (items.First().PaymentMethod == NPaymentMethod.Zelle)
                    {
                        var recipientEmails = emails.Append("dhamict@gmail.com").Distinct().ToArray();  // Eliminar duplicados
                        emailService.SendEmail(recipientEmails, $"{ev.Name} Registration In Process", $"Hello {items.First().FirstName} {items.First().LastName}, We are verifying your Zelle payment and will send you an email with the ticket details once it's confirmed.\r\nThank you.", new string[] { "" }, null);
                    }
                }
                ApiClient apiClient = new ApiClient();
                apiClient.ApiURL = "https://new-api.biopayday.net/api/public";
                //apiClient.ApiURL = "http://localhost:8088/api/public";
                if (!string.IsNullOrEmpty(await apiClient.BasicAuthenticateAsync(ev.CompanyCode ?? "50034", "support", "abcd-1234")))
                {
                    foreach (var ticket in eventTickets)
                    {
                        //changed because Device QR Reader cannot read - characters
                        //var qrCodeText = $"{prodUrl}/Tickets/Details/{ticket.Id}?eventId={ticket.EventId}";
                        var noDashTicketId = ticket.Id.ToString().Replace("-", "");
                        var qrCodeText = $"{prodUrl}/Tickets/Details/{noDashTicketId}";

                        var result = await apiClient.CreateUserAsync(new API_Client.Models.User() { UserID = ticket.InternalId.ToString(), FirstName = $"{ticket.FirstName} {ticket.LastName} ", LastName = "Table to be assigned", ExtID1 = qrCodeText });
                        if (ticket.Credentials != null)
                        {
                            var faceResult = await apiClient.CreateUserFaceAsync(new API_Client.Models.UserFaceVM() { UserId = ticket.InternalId.ToString(), Picture = Convert.ToBase64String(ticket.Credentials), Template = Convert.ToBase64String(ticket.Credentials) });
                        }
                    }
                }

                return Ok(eventTickets);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, ex.ToString());
                return Problem(ex.Message);
            }
        }
        private Image ByteArrayToImage(byte[] byteArrayIn)
        {
            MemoryStream ms = new MemoryStream(byteArrayIn);
            System.Drawing.Image returnImage = Image.FromStream(ms);
            return returnImage;
        }

        private string getBetweenDates(DateTime start, DateTime end)
        {
            string dates = string.Empty;
            for (DateTime i = start; i <= end; i = i.AddDays(1))
            {
                dates = string.IsNullOrEmpty(dates) ? i.ToString("yyyy-MM-dd") : $"{dates},{i.ToString("yyyy-MM-dd")}";
            }
            return dates;
        }

        [HttpPost()]
        [Route("checkCoupon")]
        public async Task<IActionResult> CheckCoupon([FromBody] CheckCouponVM couponVM)
        {
            var coupon = _context.EventTicketCoupons.Include(z => z.Event).FirstOrDefault(x => x.Code == couponVM.CouponCode);

            if (coupon == null)
                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "coupon-not-found", Description = "Coupon Code is invalid." } } });

            if (coupon.Percentage != 100)
                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "coupon-not-found", Description = "Coupon is not 100%." } } });

            var eve = coupon.Event;
            var used = _context.EventTickets.Where(x => x.PaymentRecordId == coupon.Code && x.TicketStatus == NTicketStatus.Active).ToList();
            if (coupon == null || coupon.Expiration < DateTime.Now || coupon.Status == NCouponStatus.Used || coupon.Status == NCouponStatus.Expired || coupon.Status == NCouponStatus.Deleted || (coupon.Event != null && coupon.Event.Id != couponVM.EventId) || (coupon.Status == NCouponStatus.PartialUsed && coupon.Usage <= used.Count))
                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon", Description = "Coupon Code is not valid at this moment." } } });

            var couponDates = coupon.Dates?.Split(',');
            var purchaseDates = couponVM.Dates?.Split(',');
            if (couponDates == null || couponDates.Length == 0 || purchaseDates == null || purchaseDates.Length == 0)
                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-dates", Description = "Coupon Code is not valid for Dates." } } });

            foreach (var d in purchaseDates)
            {
                if (!couponDates.Contains(d))
                    return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-dates", Description = "Coupon Code is not valid for some Dates selected." } } });
            }

            var couponRooms = coupon.Rooms?.Split(',');
            var purchaseRooms = couponVM.Rooms?.Split(",");
            if (couponRooms == null || couponRooms.Length == 0 || purchaseRooms == null || purchaseRooms.Length == 0)
                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-rooms", Description = "Coupon Code is not valid for Rooms." } } });

            foreach (var d in purchaseRooms)
            {
                if (!couponRooms.Contains(d))
                    return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-payment-coupon-rooms", Description = "Coupon Code is not valid for some Rooms selected." } } });
            }

            return Ok(true);
        }

        [HttpPost()]
        [Route("CheckInOut")]
        public async Task<IActionResult> CheckInOut([FromBody] CheckInOutVM checkInVM)
        {
            var ticket = await _context.EventTickets.Include(z => z.Event).FirstOrDefaultAsync(x => x.Id == checkInVM.TicketId);
            if (ticket == null)
                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "ticket-not-found", Description = "Ticket Id is invalid." } } });

            var registrant = await _context.Persons.FirstOrDefaultAsync(x => x.PassCode == checkInVM.PassCode);

            if (registrant == null)
                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "invalid-registrant", Description = "Invalid Registrant for Check In or Out." } } });

            ApiClient apiClient = new ApiClient();
            apiClient.ApiURL = "https://new-api.biopayday.net/api/public";
            //apiClient.ApiURL = "http://localhost:8088/api/public";
            if (string.IsNullOrEmpty(await apiClient.BasicAuthenticateAsync(ticket.Event.CompanyCode ?? "50034", "support", "abcd-1234")))
                return BadRequest(new { Succeeded = false, Errors = new[] { new { Code = "api-login-failed", Description = "Can't login to API" } } });

            var result = await apiClient.CreateTimeLogAsync(new API_Client.Models.UserTimeLogVM() { UserID = ticket.InternalId.ToString(), LogTime = checkInVM.LogTime });

            return Ok(true);
        }
    }
}
