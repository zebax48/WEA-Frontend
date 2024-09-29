using EventsRegistrationApi.Entities;
using EventsRegistrationApi.Lib.ApiContracts;
using EventsRegistrationApi.Lib.Security;
using System.Text.Json.Serialization;
using System.Text.Json;
using System.Collections.Generic;
using EventsRegistrationApi.Lib.ViewModels;
using Newtonsoft.Json.Linq;
using EventsRegistrationApi.Lib.Domain;

namespace EventsManagementSystem.Lib
{
	public class PublicApiClient
	{
        private readonly IConfiguration _config;
        public PublicApiClient(IConfiguration config)
        {
            _config = config;
        }
        public string CreateUrl(string endpoint)
        {
            var host = _config["SystemApi:Host"] ?? "https://localhost:4500/";
            return string.Format("{0}{1}", host, endpoint);
        }
        public async Task<List<Event>> GetEvents(EventFilter filter)
        {
            using (var client = new HttpClient())
            {
                Uri base_uri = new Uri(CreateUrl(PublicApiUrl.Events));
                Uri uri = new Uri(base_uri, filter.ToQueryString());
                var response = await client.GetAsync(uri);

                if (response.IsSuccessStatusCode)
                {
                    var data = await response.Content.ReadFromJsonAsync<List<Event>>();
                    return data ?? new List<Event>();
                }
                return new List<Event>();
            }
        }
        public async Task<Event?> GetEvent(Guid id)
        {
            using (var client = new HttpClient())
            {
                Uri base_uri = new Uri($"{CreateUrl(PublicApiUrl.Events)}/{id}");
                
                var response = await client.GetAsync(base_uri);

                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<Event?>();
                }
                return null;
            }
        }
        public async Task<ApiClientResponse?> PublicTicketPurchase(PublicTicketPurchaseVM item)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var res = await client.PostAsJsonAsync(CreateUrl(PublicApiUrl.Tickets), item);
					JObject joResponse = JObject.Parse(await res.Content.ReadAsStringAsync());
					JObject ojObject = (JObject)joResponse["res"];
					if (res.IsSuccessStatusCode)
                    {
                        var result = await res.Content.ReadFromJsonAsync<EventTicket>();
                        return new ApiClientResponse()
                        {
                            Succeeded = true,
                            Errors = null,
                            Payload = result
                        };
                    }
                    else
                    {
                        var result = await res.Content.ReadFromJsonAsync<ApiClientResponse>();
                        return result;
                    }
                }
            }
            catch (Exception ex)
            {
                return null;
            }
        }
		public async Task<ApiClientResponse?> PublicTicketPurchaseBulk(List<PublicTicketPurchaseVM> items)
		{
			try
			{
				using (var client = new HttpClient())
				{
					var res = await client.PostAsJsonAsync(CreateUrl(PublicApiUrl.Tickets + "/publicTicketBulk"), items);
                    var a = await res.Content.ReadAsStringAsync();
					//JObject joResponse = JObject.Parse(await res.Content.ReadAsStringAsync());
					//JObject ojObject = (JObject)joResponse["res"];
					if (res.IsSuccessStatusCode)
					{
						var result = await res.Content.ReadFromJsonAsync<List<EventTicket>>();
						return new ApiClientResponse()
						{
							Succeeded = true,
							Errors = null,
							PayloadBulk = result
						};
					}
					else
					{
						var result = await res.Content.ReadFromJsonAsync<ApiClientResponse>();
						return result;
					}
				}
			}
			catch (Exception ex)
			{
				return null;
			}
		}
		public async Task<EventTicket?> GetPublicTicket(Guid id)
        {
            using (var client = new HttpClient())
            {
                Uri base_uri = new Uri($"{CreateUrl(PublicApiUrl.Tickets)}/{id}");

                var response = await client.GetAsync(base_uri);

                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<EventTicket?>();
                }
                return null;
            }
        }
        public async Task<ApiClientResponse> ConfirmEmail(string email, string code)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var res = await client.PostAsJsonAsync(CreateUrl(PublicApiUrl.Account), new { email = email, code = code });
                    
                    if (res.IsSuccessStatusCode)
                    {
                        var result = await res.Content.ReadFromJsonAsync<bool>();
                        return new ApiClientResponse()
                        {
                            Succeeded = true,
                            Errors = null,
                            Payload = result
                        };
                    }
                    else
                    {
                        var result = await res.Content.ReadFromJsonAsync<ApiClientResponse>();
                        return result;
                    }
                }
            }
            catch (Exception ex)
            {
                return null;
            }
        }
        public async Task<ApiClientResponse> CheckCoupon(string code, Guid eventId, string rooms, string dates)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var res = await client.PostAsJsonAsync(CreateUrl(PublicApiUrl.Tickets+ "/checkCoupon"), new CheckCouponVM() { CouponCode = code, EventId = eventId, Rooms = rooms, Dates = dates });

                    if (res.IsSuccessStatusCode)
                    {
                        var result = await res.Content.ReadFromJsonAsync<bool>();
                        return new ApiClientResponse()
                        {
                            Succeeded = true,
                            Errors = null,
                            Payload = result
                        };
                    }
                    else
                    {
                        var result = await res.Content.ReadFromJsonAsync<ApiClientResponse>();
                        return result;
                    }
                }
            }
            catch (Exception ex)
            {
                return null;
            }
        }
        public async Task<ApiClientResponse> CheckInOut(CheckInOutVM checkInOutVM)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var res = await client.PostAsJsonAsync(CreateUrl(PublicApiUrl.Tickets + "/CheckInOut"), checkInOutVM);
                    //JObject joResponse = JObject.Parse(await res.Content.ReadAsStringAsync());
                    //JObject ojObject = (JObject)joResponse["res"];
                    if (res.IsSuccessStatusCode)
                    {
                        var result = await res.Content.ReadFromJsonAsync<bool>();
                        return new ApiClientResponse()
                        {
                            Succeeded = true,
                            Errors = null,
                            Payload = result
                        };
                    }
                    else
                    {
                        var result = await res.Content.ReadFromJsonAsync<ApiClientResponse>();
                        return result;
                    }
                }
            }
            catch (Exception ex)
            {
                return null;
            }
        }
    }
}
