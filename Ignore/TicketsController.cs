using EventsManagementSystem.Lib;
using EventsManagementSystem.Models;
using EventsRegistrationApi.Entities;
using EventsRegistrationApi.Lib.ApiContracts;
using EventsRegistrationApi.Lib.Domain;
using EventsRegistrationApi.Lib.ViewModels;
using Microsoft.AspNetCore.Mvc;
using System.Net.Sockets;

using Stripe.Infrastructure;
using SendGrid.Helpers.Mail;
using Stripe;
using Stripe.Issuing;
using Stripe.TestHelpers;
using Serilog.Parsing;
using EventsRegistrationApi.Migrations;

namespace EventsManagementSystem.Controllers
{
	public class TicketsController : EventsSystemController
	{
		private readonly ILogger<HomeController> _logger;
		private readonly IConfiguration _config;

		public TicketsController(ILogger<HomeController> logger, IConfiguration config)
		{
			_logger = logger;
			_config = config;
		}
		public IActionResult Index()
		{
			return View();
		}
		public async Task<IActionResult> NewTicket(Guid eventId, string? couponCode, string? company)
		{


			var publicClient = new PublicApiClient(_config);
			var e = await publicClient.GetEvent(eventId);
			if (e == null)
				return View("_event404");

			ViewBag.host = _config["SystemApi:Host"] ?? "https://localhost:4500/";
			ViewBag.CouponCode = couponCode;
			ViewBag.Company = company;
			ViewBag.Event = e;

			return View();
		}
		public async Task<IActionResult> NewTicketIntent(PublicTicketPurchaseVM ticket, CancellationToken ct)
		{
			try
			{
				StripeConfiguration.ApiKey = _config["StripeSettings:SecretKey"] ?? "sk_test_";
				string publishable_key = _config["StripeSettings:PublishableKey"] ?? "pk_test_";
				var publicClient = new PublicApiClient(_config);
				var eve = await publicClient.GetEvent(ticket.EventId);
				if (eve == null)
					return Json(new { succeeded = false, message = "Event not found" });
				if (eve.EarlyBirdTotalTickets <= 0 && ticket.PriceMethod == NPriceMethod.Early)
					return Json(new { succeeded = false, message = "Early bird tickets sold out" });
				if (eve.RegularTotalTickets <= 0 && ticket.PriceMethod == NPriceMethod.Regular)
					return Json(new { succeeded = false, message = "Regular tickets sold out" });
				if (eve.LastMinuteTotalTickets <= 0 && ticket.PriceMethod == NPriceMethod.Last)
					return Json(new { succeeded = false, message = "Last minute tickets sold out" });

				var selectedPrice = (ticket.PriceMethod == NPriceMethod.Early) ? eve.EarlyBirdPrice : (ticket.PriceMethod == NPriceMethod.Regular ? eve.VisitorPrice : eve.LastMinutePrice);
				var originalPrice = (ticket.GroupQty == null || ticket.GroupQty == 0) ? selectedPrice : selectedPrice * (ticket.GroupQty + 1);
				var ev_price = originalPrice;
				var pk_price = (ticket.ParkingMethod == NParkingMethod.Free) ? (float?)0 : (ticket.ParkingMethod == NParkingMethod.Standard ? eve.StandardParkingPrice : eve.VIPParkingPrice);

				var apiClient = new ApiClient(_config);
				string couponPercentage = Request.Form["couponPercentage"];
				decimal discount = 0;
				if (ticket.PaymentMethod != "coupon" && !string.IsNullOrEmpty(couponPercentage))
				{
					var coupons = await apiClient.GetCoupons(new CouponFilter() { Code = couponPercentage }, GetToken);
					if (coupons != null && coupons.Any())
					{
						var matchedCoupon = coupons.FirstOrDefault(c => c.EventId == ticket.EventId);
						if (matchedCoupon != null && matchedCoupon.Status != NCouponStatus.Used)
						{
							decimal percentage = (decimal)(matchedCoupon.Percentage ?? 0);
							discount = percentage / 100m * (decimal)originalPrice;

						}
						else
						{

							return Json(new { succeeded = false, message = "This coupon has already been fully used" });
						}
					}
					else
					{

						return Json(new { succeeded = false, message = "Coupon not valid for this event" });
					}
				}


				var zellePercentageValidation = eve.ZellePercentage ?? 0;
				var zelleFeePercentageValidation = eve.ZelleFee ?? 0;
				var zellePercentage = (decimal)zellePercentageValidation / 100;
				var ev_price_decimal = (decimal)(ev_price ?? 0);
				var percentageOfPriceTicket = ev_price_decimal * zellePercentage;
				var zelleFeePlusPercentage = ticket.GroupQty != null ? percentageOfPriceTicket + ((decimal)zelleFeePercentageValidation * (ticket.GroupQty + 1)) : percentageOfPriceTicket + (decimal)zelleFeePercentageValidation;
				var totalTicketPlusZelle = ev_price_decimal + zelleFeePlusPercentage - discount;
				var totalTicketPlustotal_price = totalTicketPlusZelle + (decimal)(pk_price ?? 0);

				var cashPercentageValidation = eve.CashPercentage ?? 0;
				var cashFeePercentageValidation = eve.CashFee ?? 0;
				var cashPercentage = (decimal)cashPercentageValidation / 100;
				var percentageOfPriceTicketCash = ev_price_decimal * cashPercentage;
				var cashFeePlusPercentage = ticket.GroupQty != null ? percentageOfPriceTicketCash + ((decimal)cashFeePercentageValidation * (ticket.GroupQty + 1)) : percentageOfPriceTicketCash + (decimal)cashFeePercentageValidation;
				var totalTicketPlusCash = ev_price_decimal + cashFeePlusPercentage - discount;
				var totalTicketPlustotal_priceCash = totalTicketPlusCash + (decimal)(pk_price ?? 0);

				var cardPercentageValidation = eve.CreditCardPercentage ?? 0;
				var cardFeePercentageValidation = eve.CreditCardFee ?? 0;
				var cardPercentage = (decimal)cardPercentageValidation / 100;
				var cardPercentageOfPriceTicket = ev_price_decimal * cardPercentage;
				var cardFeePlusPercentage = ticket.GroupQty != null ? cardPercentageOfPriceTicket + ((decimal)cardFeePercentageValidation * (ticket.GroupQty + 1)) : cardPercentageOfPriceTicket + (decimal)cardFeePercentageValidation;
				var totalTicketPlusCard = ev_price_decimal + cardFeePlusPercentage - discount;
				var totalTicketPlustotal_priceCard = totalTicketPlusCard + (decimal)(pk_price ?? 0);


				var moncashPercentageValidation = eve.MoncashPercentage ?? 0;
				var moncashFeePercentageValidation = eve.MoncashFee ?? 0;
				var moncashPercentage = (decimal)moncashPercentageValidation / 100;
				var moncashPercentageOfPriceTicket = ev_price_decimal * moncashPercentage;
				var moncashFeePlusPercentage = ticket.GroupQty != null ? moncashPercentageOfPriceTicket + ((decimal)moncashFeePercentageValidation * (ticket.GroupQty + 1)) : moncashPercentageOfPriceTicket + (decimal)moncashFeePercentageValidation;
				var totalTicketPlusmoncash = ev_price_decimal + moncashFeePlusPercentage - discount;
				var totalTicketPlustotal_pricemoncash = totalTicketPlusmoncash + (decimal)(pk_price ?? 0);

				var natCashPercentageValidation = eve.NatCashPercentage ?? 0;
				var natCashFeePercentageValidation = eve.NatCashFee ?? 0;
				var natCashPercentage = (decimal)natCashPercentageValidation / 100;
				var natCashPercentageOfPriceTicket = ev_price_decimal * natCashPercentage;
				var natCashFeePlusPercentage = ticket.GroupQty != null ? natCashPercentageOfPriceTicket + ((decimal)natCashFeePercentageValidation * (ticket.GroupQty + 1)) : natCashPercentageOfPriceTicket + (decimal)natCashFeePercentageValidation;
				var totalTicketPlusnatCash = ev_price_decimal + natCashFeePlusPercentage - discount;
				var totalTicketPlustotal_pricenatCash = totalTicketPlusnatCash + (decimal)(pk_price ?? 0);

                var psePercentageValidation = eve.PsePercentage ?? 0;
                var pseFeePercentageValidation = eve.PseFee ?? 0;
                var psePercentage = (decimal)psePercentageValidation / 100;
                var psePercentageOfPriceTicket = ev_price_decimal * psePercentage;
                var pseFeePlusPercentage = ticket.GroupQty != null ? psePercentageOfPriceTicket + ((decimal)pseFeePercentageValidation * (ticket.GroupQty + 1)) : psePercentageOfPriceTicket + (decimal)pseFeePercentageValidation;
                var totalTicketPluspse = ev_price_decimal + pseFeePlusPercentage - discount;
                var totalTicketPlustotal_pricepse = totalTicketPluspse + (decimal)(pk_price ?? 0);

                int total_price = (int)(((decimal)(ev_price ?? 0) * 100) + ((decimal)(pk_price ?? 0) * 100));
				decimal p = total_price / 100m;

				var zelleFeePlusPercentage_formatted = string.Format("{0:0.00}", zelleFeePlusPercentage);
				var totalTicketPlustotal_price_formatted = string.Format("{0:0.00}", totalTicketPlustotal_price);

				var cashFeePlusPercentage_formatted = string.Format("{0:0.00}", cashFeePlusPercentage);
				var totalTicketPlustotal_priceCash_formatted = string.Format("{0:0.00}", totalTicketPlustotal_priceCash);

				var cardFeePlusPercentage_formatted = string.Format("{0:0.00}", cardFeePlusPercentage);
				var totalTicketPlustotal_priceCard_formatted = string.Format("{0:0.00}", totalTicketPlustotal_priceCard);

				var moncashFeePlusPercentage_formatted = string.Format("{0:0.00}", moncashFeePlusPercentage);
				var totalTicketPlustotal_pricemoncash_formatted = string.Format("{0:0.00}", totalTicketPlustotal_pricemoncash);

				var natCashFeePlusPercentage_formatted = string.Format("{0:0.00}", natCashFeePlusPercentage);
				var totalTicketPlustotal_pricenatCash_formatted = string.Format("{0:0.00}", totalTicketPlustotal_pricenatCash);

                var pseFeePlusPercentage_formatted = string.Format("{0:0.00}", pseFeePlusPercentage);
                var totalTicketPlustotal_pricepse_formatted = string.Format("{0:0.00}", totalTicketPlustotal_pricepse);


                var totalOriginalPriceFormatted = string.Format("{0:0.00}", originalPrice);
				var discountFormatted = string.Format("{0:0.00}", discount);
				var pk_priceFormatted = string.Format("{0:0.00}", pk_price);
				var intentPaymentAmount = totalTicketPlustotal_priceCard * 100;
				var options = new PaymentIntentCreateOptions
				{
					Amount = (long)intentPaymentAmount,
					Currency = "usd",
					AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
					{
						Enabled = true,
					},
				};
				var service = new PaymentIntentService();
				var intent = service.Create(options);

				return Json(new
				{
					client_secret = intent.ClientSecret,
					publishable_key = publishable_key,
					succeeded = true,
					price = p.ToString("0.00"),
					new_price_zelle = zelleFeePlusPercentage_formatted,
					total_price_zelle = totalTicketPlustotal_price_formatted,
					new_price_cash = cashFeePlusPercentage_formatted,
					total_price_cash = totalTicketPlustotal_priceCash_formatted,
					new_price_card = cardFeePlusPercentage_formatted,
					total_price_card = totalTicketPlustotal_priceCard_formatted,
					total_original_price = totalOriginalPriceFormatted,
					discount = discountFormatted,
					parking_price = pk_priceFormatted,
					new_price_moncash = moncashFeePlusPercentage_formatted,
					total_price_moncash = totalTicketPlustotal_pricemoncash_formatted,
                    new_price_natCash = natCashFeePlusPercentage_formatted,
                    total_price_natCash = totalTicketPlustotal_pricenatCash_formatted,
                    new_price_pse = pseFeePlusPercentage_formatted,
                    total_price_pse = totalTicketPlustotal_pricepse_formatted,


                });
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error creating payment intent");
				TempData["ErrorMessage"] = "An error occurred while creating the payment intent. Please try again.";
				return Json(new { succeeded = false, message = ex.Message });
			}
		}
		public async Task<IActionResult> PurchaseTicket(PublicTicketPurchaseVM ticket, string PayCoupon, CancellationToken ct)
		{
			try
			{
				var publicClient = new PublicApiClient(_config);
				ticket.Rooms = string.Empty;
				ticket.Dates = string.Empty;
				var eve = await publicClient.GetEvent(ticket.EventId);


				if (!string.IsNullOrEmpty(eve.Rooms))
				{
					var rooms = eve.Rooms.Split(',');
					foreach (var room in rooms)
					{
						var tmpRoom = room.Replace(' ', '-');
						string inputValue = Request.Form["room-" + tmpRoom];
						if (inputValue != null)
							ticket.Rooms = ticket.Rooms + (string.IsNullOrEmpty(ticket.Rooms) ? room : "," + room);
					}
				}

				for (DateTime i = eve.EventStartDate; i <= eve.EventEndDate; i = i.AddDays(1))
				{
					string inputValue = Request.Form["ticketDay-" + i.ToString("yyyy-MM-dd")];
					if (inputValue != null)
						ticket.Dates = ticket.Dates + (string.IsNullOrEmpty(ticket.Dates) ? i.ToString("yyyy-MM-dd") : "," + i.ToString("yyyy-MM-dd"));
				}

				var groupId = Guid.NewGuid();
				ticket.GroupId = groupId;
				ticket.GroupMain = true;

				var selectedPrice = (ticket.PriceMethod == NPriceMethod.Early) ? eve.EarlyBirdPrice : (ticket.PriceMethod == NPriceMethod.Regular ? eve.VisitorPrice : eve.LastMinutePrice);
				var originalPrice = (ticket.GroupQty == null || ticket.GroupQty == 0) ? selectedPrice : selectedPrice * (ticket.GroupQty + 1);
				var ev_price = originalPrice;
				var pk_price = (ticket.ParkingMethod == NParkingMethod.Free) ? 0 : (ticket.ParkingMethod == NParkingMethod.Standard ? eve.StandardParkingPrice : eve.VIPParkingPrice);

				var apiClient = new ApiClient(_config);
				string couponPercentage = Request.Form["couponPercentage"];
				decimal discount = 0;
				var couponsDiscount = new List<EventTicketCoupon>();

				if (couponPercentage != "")
				{
					couponsDiscount = await apiClient.GetCoupons(new CouponFilter() { Code = couponPercentage }, GetToken);
				}

				if (ticket.PaymentMethod != "coupon" && !string.IsNullOrEmpty(couponPercentage))
				{

					if (couponsDiscount != null && couponsDiscount.Any())
					{
						var matchedCoupon = couponsDiscount.FirstOrDefault(c => c.EventId == ticket.EventId);
						if (matchedCoupon != null)
						{
							decimal percentage = (decimal)(matchedCoupon.Percentage ?? 0);
							discount = percentage / 100m * (decimal)originalPrice;


							if (matchedCoupon.Used < matchedCoupon.Usage)
							{
								matchedCoupon.Used += 1;
								matchedCoupon.Status = matchedCoupon.Used == matchedCoupon.Usage ? NCouponStatus.Used : NCouponStatus.PartialUsed;
								await apiClient.UpdateCouponAsync(matchedCoupon, GetToken);
							}
							else if (matchedCoupon.Used >= matchedCoupon.Usage)
							{
								matchedCoupon.Status = NCouponStatus.Used;
								await apiClient.UpdateCouponAsync(matchedCoupon, GetToken);
							}
						}
					}
				}

				var ev_price_decimal = Convert.ToDecimal(ev_price);

				var zellePercentageValidation = eve.ZellePercentage == null ? eve.ZellePercentage = 0 : eve.ZellePercentage;
				var zelleFeePercentageValidation = eve.ZelleFee == null ? eve.ZelleFee = 0 : eve.ZelleFee;

				var zellePercentage = Convert.ToDecimal(zellePercentageValidation) / 100;
				var percentageOfPriceTicket = ev_price_decimal * Convert.ToDecimal(zellePercentage);
				var zelleFeePlusPercentage = ticket.GroupQty != null ? percentageOfPriceTicket + ((decimal)zelleFeePercentageValidation * (ticket.GroupQty + 1)) : percentageOfPriceTicket + (decimal)zelleFeePercentageValidation;
				var totalTicketPlusZelle = ev_price_decimal + zelleFeePlusPercentage - discount;
				var totalTicketPlustotal_price = totalTicketPlusZelle + Convert.ToDecimal(pk_price);

				var cashPercentageValidation = eve.CashPercentage == null ? eve.CashPercentage = 0 : eve.CashPercentage;
				var cashFeePercentageValidation = eve.CashFee == null ? eve.CashFee = 0 : eve.CashFee;

				var cashPercentage = Convert.ToDecimal(cashPercentageValidation) / 100;
				var percentageOfPriceTicketCash = ev_price_decimal * cashPercentage;
				var cashFeePlusPercentage = ticket.GroupQty != null ? percentageOfPriceTicketCash + ((decimal)cashFeePercentageValidation * (ticket.GroupQty + 1)) : percentageOfPriceTicketCash + (decimal)cashFeePercentageValidation;
				var totalTicketPlusCash = ev_price_decimal + cashFeePlusPercentage - discount;
				var totalTicketPlustotal_priceCash = totalTicketPlusCash + Convert.ToDecimal(pk_price);

				var cardPercentageValidation = eve.CreditCardPercentage == null ? eve.CreditCardPercentage = 0 : eve.CreditCardPercentage;
				var cardFeePercentageValidation = eve.CreditCardFee == null ? eve.CreditCardFee = 0 : eve.CreditCardFee;

				var cardPercentage = Convert.ToDecimal(cardPercentageValidation) / 100;
				var percentageOfPriceTicketCard = ev_price_decimal * Convert.ToDecimal(cardPercentage);
				var cardFeePlusPercentage = ticket.GroupQty != null ? percentageOfPriceTicketCard + ((decimal)cardFeePercentageValidation * (ticket.GroupQty + 1)) : percentageOfPriceTicketCard + (decimal)cardFeePercentageValidation;
				var totalTicketPlusCard = ev_price_decimal + cardFeePlusPercentage - discount;
				var totalTicketPlustotal_priceCard = totalTicketPlusCard + Convert.ToDecimal(pk_price);

				var moncashPercentageValidation = eve.MoncashPercentage == null ? eve.MoncashPercentage = 0 : eve.MoncashPercentage;
				var moncashFeePercentageValidation = eve.MoncashFee == null ? eve.MoncashFee = 0 : eve.MoncashFee;

				var moncashPercentage = Convert.ToDecimal(moncashPercentageValidation) / 100;
				var percentageOfPriceTicketmoncash = ev_price_decimal * Convert.ToDecimal(moncashPercentage);
				var moncashFeePlusPercentage = ticket.GroupQty != null ? percentageOfPriceTicketmoncash + ((decimal)moncashFeePercentageValidation * (ticket.GroupQty + 1)) : percentageOfPriceTicketmoncash + (decimal)moncashFeePercentageValidation;
				var totalTicketPlusmoncash = ev_price_decimal + moncashFeePlusPercentage - discount;
				var totalTicketPlustotal_pricemoncash = totalTicketPlusmoncash + Convert.ToDecimal(pk_price);

				var natCashPercentageValidation = eve.NatCashPercentage == null ? eve.NatCashPercentage = 0 : eve.NatCashPercentage;
				var natCashFeePercentageValidation = eve.NatCashFee == null ? eve.NatCashFee = 0 : eve.NatCashFee;

				var natCashPercentage = Convert.ToDecimal(natCashPercentageValidation) / 100;
				var percentageOfPriceTicketnatCash = ev_price_decimal * Convert.ToDecimal(natCashPercentage);
				var natCashFeePlusPercentage = ticket.GroupQty != null ? percentageOfPriceTicketnatCash + ((decimal)natCashFeePercentageValidation * (ticket.GroupQty + 1)) : percentageOfPriceTicketnatCash + (decimal)natCashFeePercentageValidation;
				var totalTicketPlusnatCash = ev_price_decimal + natCashFeePlusPercentage - discount;
				var totalTicketPlustotal_pricenatCash = totalTicketPlusnatCash + Convert.ToDecimal(pk_price);


                var psePercentageValidation = eve.PsePercentage == null ? eve.PsePercentage = 0 : eve.PsePercentage;
                var pseFeePercentageValidation = eve.PseFee == null ? eve.PseFee = 0 : eve.PseFee;

                var psePercentage = Convert.ToDecimal(psePercentageValidation) / 100;
                var percentageOfPriceTicketpse = ev_price_decimal * Convert.ToDecimal(psePercentage);
                var pseFeePlusPercentage = ticket.GroupQty != null ? percentageOfPriceTicketpse + ((decimal)pseFeePercentageValidation * (ticket.GroupQty + 1)) : percentageOfPriceTicketpse + (decimal)pseFeePercentageValidation;
                var totalTicketPluspse = ev_price_decimal + pseFeePlusPercentage - discount;
                var totalTicketPlustotal_pricepse = totalTicketPluspse + Convert.ToDecimal(pk_price);



                if (ticket.PaymentMethod == "cash")
				{
					var total_price = totalTicketPlustotal_priceCash;
					decimal p = (decimal)total_price;
					ticket.TotalAmount = p.ToString("0.00");
					ticket.PriceMethod = ticket.PriceMethod;
					ticket.TicketPrice = (float)selectedPrice;
                    ticket.CouponId = couponsDiscount != null && couponsDiscount.Count > 0 ? couponsDiscount[0].Id : null;
                }
				else if (ticket.PaymentMethod == "zelle")
				{
					var total_price = totalTicketPlustotal_price;
					decimal p = (decimal)total_price;
					ticket.TotalAmount = p.ToString("0.00");
					ticket.PriceMethod = ticket.PriceMethod;
					ticket.TicketPrice = (float)selectedPrice;
                    ticket.CouponId = couponsDiscount != null && couponsDiscount.Count > 0 ? couponsDiscount[0].Id : null;
                }
				else if (ticket.PaymentMethod == "card")
				{
					var total_price = totalTicketPlustotal_priceCard;
					decimal p = (decimal)total_price;
					ticket.TotalAmount = p.ToString("0.00");
					ticket.PriceMethod = ticket.PriceMethod;
					ticket.TicketPrice = (float)selectedPrice;
                    ticket.CouponId = couponsDiscount != null && couponsDiscount.Count > 0 ? couponsDiscount[0].Id : null;
                }
                

                else if (ticket.PaymentMethod == "moncash")
                {
                    var total_price = totalTicketPlustotal_pricemoncash;
                    decimal p = (decimal)total_price;
                    ticket.TotalAmount = p.ToString("0.00");
                    ticket.PriceMethod = ticket.PriceMethod;
                    ticket.TicketPrice = (float)selectedPrice;
                    ticket.CouponId = couponsDiscount != null && couponsDiscount.Count > 0 ? couponsDiscount[0].Id : null;
                }


				else if (ticket.PaymentMethod == "natCash")
				{
					var total_price = totalTicketPlustotal_pricenatCash;
					decimal p = (decimal)total_price;
					ticket.TotalAmount = p.ToString("0.00");
					ticket.PriceMethod = ticket.PriceMethod;
					ticket.TicketPrice = (float)selectedPrice;
					ticket.CouponId = couponsDiscount != null && couponsDiscount.Count > 0 ? couponsDiscount[0].Id : null;
				}

				else if (ticket.PaymentMethod == "pse")
				{
					var total_price = totalTicketPlustotal_pricepse;
					decimal p = (decimal)total_price;
					ticket.TotalAmount = p.ToString("0.00");
					ticket.PriceMethod = ticket.PriceMethod;
					ticket.TicketPrice = (float)selectedPrice;
					ticket.CouponId = couponsDiscount != null && couponsDiscount.Count > 0 ? couponsDiscount[0].Id : null;
				}


				else if (ticket.PaymentMethod == "coupon")
				{
					string couponCode = PayCoupon;
					var filter = new CouponFilter() { Code = couponCode };

                    var coupons = await apiClient.GetCoupons(new CouponFilter() { Code = couponCode }, GetToken);
					if (coupons != null && coupons.Any())
					{
						bool couponUsed = false;
						foreach (var coupon in coupons)
						{
							if (coupon.Code == couponCode)
							{
								if (coupon.Used < coupon.Usage)
								{
									coupon.Used += 1;
									coupon.Status = coupon.Used == coupon.Usage ? NCouponStatus.Used : NCouponStatus.PartialUsed;
									await apiClient.UpdateCouponAsync(coupon, GetToken);
									return Json(coupons);

								}
								else if (coupon.Used >= coupon.Usage)
								{
									coupon.Status = NCouponStatus.Used;
									await apiClient.UpdateCouponAsync(coupon, GetToken);
									couponUsed = true;
									break;
								}
							}
						}
						if (couponUsed)
						{
							return Json(new { succeeded = false, message = "Coupon usage limit reached" });
						}
					}
					else
					{
						_logger.LogError($"No se encontraron cupones con el código {couponCode}.");
						return Json(new { succeeded = false, message = "Invalid coupon code", couponsData = coupons, couponCodeData = couponCode, GetTokenData = GetToken, filterData = filter });
					}

					int total_price = (int)(ev_price * 100 + pk_price * 100);
					decimal p = total_price / 100;
					ticket.TotalAmount = p.ToString("0.00");
					ticket.PriceMethod = ticket.PriceMethod;
					ticket.TicketPrice = (float)selectedPrice;
				}

				ApiClientResponse res = new ApiClientResponse();
				if (ticket.GroupQty == null || ticket.GroupQty == 0)
				{
					res = await publicClient.PublicTicketPurchase(ticket);
				}
				else if (ticket.GroupQty != null && ticket.GroupQty > 0)
				{
					List<PublicTicketPurchaseVM> tickets = new List<PublicTicketPurchaseVM> { ticket };

					for (int i = 1; i <= ticket.GroupQty; i++)
					{
						string fname = string.IsNullOrEmpty(Request.Form["firstName_" + i]) ? ticket.FirstName : Request.Form["firstName_" + i];
						string lname = string.IsNullOrEmpty(Request.Form["lastName_" + i]) ? ticket.LastName : Request.Form["lastName_" + i];
						tickets.Add(new PublicTicketPurchaseVM()
						{
							FirstName = fname,
							LastName = lname,
							GroupId = groupId,
							PaymentMethod = ticket.PaymentMethod,
							Company = ticket.Company,
							CompanyAddress = ticket.CompanyAddress,
							CompanyEmail = ticket.CompanyEmail,
							Email = ticket.Email,
							EventId = ticket.EventId,
							GroupQty = ticket.GroupQty,
							ParkingMethod = ticket.ParkingMethod,
							CompanyPhone = ticket.CompanyPhone,
							CompanyName = ticket.CompanyName,
							Dates = ticket.Dates,
							PayAddress1 = ticket.PayAddress1,
							PayAddress2 = ticket.PayAddress2,
							PayCardName = ticket.PayCardName,
							PayCity = ticket.PayCity,
							PayCardNumber = ticket.PayCardNumber,
							PayCoupon = ticket.PayCoupon,
							PayCVV = ticket.PayCVV,
							PayZipCode = ticket.PayZipCode,
							Rooms = ticket.Rooms,
							ZelleAccount = ticket.ZelleAccount,
							ZelleAmount = ticket.ZelleAmount,
							ZelleName = ticket.ZelleName,
							CashAppAccount = ticket.CashAppAccount,
							CashAppAmount = ticket.CashAppAmount,
							CashAppName = ticket.CashAppName,
							Picture = ticket.Picture,
							GroupMain = false,
							PriceMethod = ticket.PriceMethod,
							TicketPrice = (float)selectedPrice,
							CouponId = ticket.CouponId,
                            MoncashAccount = ticket.MoncashAccount,
                            MoncashAmount = ticket.MoncashAmount,
                            MoncashName = ticket.NatCashName,
                            NatCashAccount = ticket.NatCashAccount,
                            NatCashAmount = ticket.NatCashAmount,
                            NatCashName = ticket.NatCashName,
                            PseAccount = ticket.PseAccount,
                            PseAmount = ticket.PseAmount,
                            PseName = ticket.PseName,

                        });
					}
					var result = await publicClient.PublicTicketPurchaseBulk(tickets);
					res.PayloadBulk = result?.PayloadBulk;
					res.Succeeded = true;
					res.Errors = null;
				}

				if (ticket.PaymentMethod == NPaymentMethod.Coupon || ticket.PaymentMethod == NPaymentMethod.Card)
					return Json(res);
				else
				{
					return Json(new ApiClientResponse() { Errors = null, Succeeded = true, Payload = null, PayloadBulk = null });
				}
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error finishing payment ");
				return Json(new ApiClientResponse() { Errors = null, Succeeded = false, Payload = null, PayloadBulk = null });
			}
		}
		public async Task<IActionResult> Details([FromRoute]string id)
		{
			id = id.Replace("-", "");
			string guidStringWithDashes = InsertDashes(id);
			Guid guid = new Guid(guidStringWithDashes);

			var publicClient = new PublicApiClient(_config);
			var e = await publicClient.GetPublicTicket(guid);
			return View(e);
		}

		[HttpPost]
		public async Task<IActionResult> CheckInOut([FromBody] CheckInOutVM checkInOutVM)
		{
			var publicClient = new PublicApiClient(_config);
			var e = await publicClient.CheckInOut(checkInOutVM);
			return Json(e);
		}

		[HttpPost]
		public async Task<IActionResult> CheckCoupon([FromBody] CheckCouponVM coupon)
		{
			var publicClient = new PublicApiClient(_config);
			var e = await publicClient.CheckCoupon(coupon.CouponCode, coupon.EventId, coupon.Rooms ?? string.Empty, coupon.Dates ?? string.Empty);
			return Json(e);
		}

		private string InsertDashes(string guid)
		{
			if (guid.Length != 32)
			{
				throw new ArgumentException("The GUID string must be 32 characters long.");
			}

			return guid.Insert(20, "-").Insert(16, "-").Insert(12, "-").Insert(8, "-");
		}
	}
}