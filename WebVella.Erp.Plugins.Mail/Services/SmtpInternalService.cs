﻿using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Mvc;
using MimeKit;
using System;
using System.Collections.Generic;
using WebVella.Erp.Api;
using WebVella.Erp.Api.Models;
using WebVella.Erp.Api.Models.AutoMapper;
using WebVella.Erp.Eql;
using WebVella.Erp.Exceptions;
using WebVella.Erp.Plugins.Mail.Api;
using WebVella.Erp.Utilities;
using WebVella.Erp.Web.Models;
using WebVella.Erp.Web.Pages.Application;
using WebVella.Erp.Web.Utils;

namespace WebVella.Erp.Plugins.Mail.Services
{
	internal class SmtpInternalService
	{
		private static object lockObject = new object();
		private static bool queueProcessingInProgress = false;

		#region <--- Hooks Logic --->

		public void ValidatePreCreateRecord(EntityRecord rec, List<ErrorModel> errors)
		{
			foreach (var prop in rec.Properties)
			{
				switch (prop.Key)
				{
					case "name":
						{
							var result = new EqlCommand("SELECT * FROM smtp_service WHERE name = @name", new EqlParameter("name", rec["name"])).Execute();
							if (result.Count > 0)
							{
								errors.Add(new ErrorModel
								{
									Key = "name",
									Value = (string)rec["name"],
									Message = "There is already existing service with that name. Name must be unique"
								});
							}
						}
						break;
					case "port":
						{
							if (!Int32.TryParse(rec["port"] as string, out int port))
							{
								errors.Add(new ErrorModel
								{
									Key = "port",
									Value = (string)rec["port"],
									Message = $"Port must be an integer value between 1 and 65025"
								});
							}
							else
							{
								if (port <= 0 || port > 65025)
								{
									errors.Add(new ErrorModel
									{
										Key = "port",
										Value = (string)rec["port"],
										Message = $"Port must be an integer value between 1 and 65025"
									});
								}
							}

						}
						break;
					case "default_from_email":
						{
							if (!((string)rec["default_from_email"]).IsEmail())
							{
								errors.Add(new ErrorModel
								{
									Key = "default_from_email",
									Value = (string)rec["default_from_email"],
									Message = $"Default from email address is invalid"
								});
							}
						}
						break;
					case "default_reply_to_email":
						{
							if (string.IsNullOrWhiteSpace((string)rec["default_reply_to_email"]))
								continue;

							if (!((string)rec["default_reply_to_email"]).IsEmail())
							{
								errors.Add(new ErrorModel
								{
									Key = "default_reply_to_email",
									Value = (string)rec["default_reply_to_email"],
									Message = $"Default reply to email address is invalid"
								});
							}
						}
						break;
					case "max_retries_count":
						{
							if (!Int32.TryParse(rec["max_retries_count"] as string, out int count))
							{
								errors.Add(new ErrorModel
								{
									Key = "max_retries_count",
									Value = (string)rec["max_retries_count"],
									Message = $"Number of retries on error must be an integer value between 1 and 10"
								});
							}
							else
							{
								if (count < 1 || count > 10)
								{
									errors.Add(new ErrorModel
									{
										Key = "max_retries_count",
										Value = (string)rec["max_retries_count"],
										Message = $"Number of retries on error must be an integer value between 1 and 10"
									});
								}
							}
						}
						break;
					case "retry_wait_minutes":
						{
							if (!Int32.TryParse(rec["retry_wait_minutes"] as string, out int minutes))
							{
								errors.Add(new ErrorModel
								{
									Key = "retry_wait_minutes",
									Value = (string)rec["retry_wait_minutes"],
									Message = $"Wait period between retries must be an integer value between 1 and 1440 minutes"
								});
							}
							else
							{
								if (minutes < 1 || minutes > 1440)
								{
									errors.Add(new ErrorModel
									{
										Key = "retry_wait_minutes",
										Value = (string)rec["retry_wait_minutes"],
										Message = $"Wait period between retries must be an integer value between 1 and 1440 minutes"
									});
								}
							}
						}
						break;
					case "connection_security":
						{
							if (!Int32.TryParse(rec["connection_security"] as string, out int connectionSecurityNumber))
							{
								errors.Add(new ErrorModel
								{
									Key = "connection_security",
									Value = (string)rec["connection_security"],
									Message = $"Invalid connection security setting selected."
								});
								continue;
							}

							try
							{
								var secOptions = (MailKit.Security.SecureSocketOptions)connectionSecurityNumber;
							}
							catch
							{
								errors.Add(new ErrorModel
								{
									Key = "connection_security",
									Value = (string)rec["connection_security"],
									Message = $"Invalid connection security setting selected."
								});
							}
						}
						break;
				}
			}
		}

		public void ValidatePreUpdateRecord(EntityRecord rec, List<ErrorModel> errors)
		{
			foreach (var prop in rec.Properties)
			{
				switch (prop.Key)
				{
					case "name":
						{
							var result = new EqlCommand("SELECT * FROM smtp_service WHERE name = @name", new EqlParameter("name", rec["name"])).Execute();
							if (result.Count > 1)
							{
								errors.Add(new ErrorModel
								{
									Key = "name",
									Value = (string)rec["name"],
									Message = "There is already existing service with that name. Name must be unique"
								});
							}
							else if (result.Count == 1 && (Guid)result[0]["id"] != (Guid)rec["id"])
							{
								errors.Add(new ErrorModel
								{
									Key = "name",
									Value = (string)rec["name"],
									Message = "There is already existing service with that name. Name must be unique"
								});
							}
						}
						break;
					case "port":
						{
							if (!Int32.TryParse(rec["port"] as string, out int port))
							{
								errors.Add(new ErrorModel
								{
									Key = "port",
									Value = (string)rec["port"],
									Message = $"Port must be an integer value between 1 and 65025"
								});
							}
							else
							{
								if (port <= 0 || port > 65025)
								{
									errors.Add(new ErrorModel
									{
										Key = "port",
										Value = (string)rec["port"],
										Message = $"Port must be an integer value between 1 and 65025"
									});
								}
							}

						}
						break;
					case "default_from_email":
						{
							if (!((string)rec["default_from_email"]).IsEmail())
							{
								errors.Add(new ErrorModel
								{
									Key = "default_from_email",
									Value = (string)rec["default_from_email"],
									Message = $"Default from email address is invalid"
								});
							}
						}
						break;
					case "default_reply_to_email":
						{
							if (string.IsNullOrWhiteSpace((string)rec["default_reply_to_email"]))
								continue;

							if (!((string)rec["default_reply_to_email"]).IsEmail())
							{
								errors.Add(new ErrorModel
								{
									Key = "default_reply_to_email",
									Value = (string)rec["default_reply_to_email"],
									Message = $"Default reply to email address is invalid"
								});
							}
						}
						break;
					case "max_retries_count":
						{
							if (!Int32.TryParse(rec["max_retries_count"] as string, out int count))
							{
								errors.Add(new ErrorModel
								{
									Key = "max_retries_count",
									Value = (string)rec["max_retries_count"],
									Message = $"Number of retries on error must be an integer value between 1 and 10"
								});
							}
							else
							{
								if (count < 1 || count > 10)
								{
									errors.Add(new ErrorModel
									{
										Key = "max_retries_count",
										Value = (string)rec["max_retries_count"],
										Message = $"Number of retries on error must be an integer value between 1 and 10"
									});
								}
							}
						}
						break;
					case "retry_wait_minutes":
						{
							if (!Int32.TryParse(rec["retry_wait_minutes"] as string, out int minutes))
							{
								errors.Add(new ErrorModel
								{
									Key = "retry_wait_minutes",
									Value = (string)rec["retry_wait_minutes"],
									Message = $"Wait period between retries must be an integer value between 1 and 1440 minutes"
								});
							}
							else
							{
								if (minutes < 1 || minutes > 1440)
								{
									errors.Add(new ErrorModel
									{
										Key = "retry_wait_minutes",
										Value = (string)rec["retry_wait_minutes"],
										Message = $"Wait period between retries must be an integer value between 1 and 1440 minutes"
									});
								}
							}
						}
						break;
					case "connection_security":
						{
							if (!Int32.TryParse(rec["connection_security"] as string, out int connectionSecurityNumber))
							{
								errors.Add(new ErrorModel
								{
									Key = "connection_security",
									Value = (string)rec["connection_security"],
									Message = $"Invalid connection security setting selected."
								});
								continue;
							}

							try
							{
								var secOptions = (MailKit.Security.SecureSocketOptions)connectionSecurityNumber;
							}
							catch
							{
								errors.Add(new ErrorModel
								{
									Key = "connection_security",
									Value = (string)rec["connection_security"],
									Message = $"Invalid connection security setting selected."
								});
							}
						}
						break;
				}
			}
		}

		public void HandleDefaultServiceSetup(EntityRecord rec, List<ErrorModel> errors)
		{
			if (rec.Properties.ContainsKey("is_default") && (bool)rec["is_default"])
			{

				var recMan = new RecordManager(executeHooks: false);
				var records = new EqlCommand("SELECT id,is_default FROM smtp_service").Execute();
				foreach (var record in records)
				{
					if ((bool)record["is_default"])
					{
						record["is_default"] = false;
						recMan.UpdateRecord("smtp_service", record);
					}
				}
			}
			else if (rec.Properties.ContainsKey("is_default") && (bool)rec["is_default"] == false)
			{
				var currentRecord = new EqlCommand("SELECT * FROM smtp_service WHERE id = @id", new EqlParameter("id", rec["id"])).Execute();
				if ((bool)currentRecord[0]["is_default"])
				{
					errors.Add(new ErrorModel
					{
						Key = "is_default",
						Value = ((bool)rec["is_default"]).ToString(),
						Message = $"Forbidden. There should always be an active default service."
					});
				}
			}
		}

		public IActionResult TestSmtpServiceOnPost(RecordDetailsPageModel pageModel)
		{
			SmtpService smtpService = null;
			string recipientEmail = string.Empty;
			string subject = string.Empty;
			string content = string.Empty;

			ValidationException valEx = new ValidationException();

			if (pageModel.HttpContext.Request.Form == null)
			{
				valEx.AddError("form", "Smtp service test page missing form tag");
				valEx.CheckAndThrow();
			}


			if (!pageModel.HttpContext.Request.Form.ContainsKey("recipient_email"))
				valEx.AddError("recipient_email", "Recipient email is not specified.");
			else
			{
				recipientEmail = pageModel.HttpContext.Request.Form["recipient_email"];
				if (string.IsNullOrWhiteSpace(recipientEmail))
					valEx.AddError("recipient_email", "Recipient email is not specified");
				else if (!recipientEmail.IsEmail())
					valEx.AddError("recipient_email", "Recipient email is not a valid email address");
			}

			if (!pageModel.HttpContext.Request.Form.ContainsKey("subject"))
				valEx.AddError("subject", "Subject is not specified");
			else
			{
				subject = pageModel.HttpContext.Request.Form["subject"];
				if (string.IsNullOrWhiteSpace(subject))
					valEx.AddError("subject", "Subject is required");
			}

			if (!pageModel.HttpContext.Request.Form.ContainsKey("content"))
				valEx.AddError("content", "Content is not specified");
			else
			{
				content = pageModel.HttpContext.Request.Form["content"];
				if (string.IsNullOrWhiteSpace(content))
					valEx.AddError("content", "Content is required");
			}

			var smtpServiceId = pageModel.DataModel.GetProperty("Record.id") as Guid?;

			if (smtpServiceId == null)
				valEx.AddError("serviceId", "Invalid smtp service id");
			else
			{
				smtpService = new ServiceManager().GetSmtpService(smtpServiceId.Value);
				if (smtpService == null)
					valEx.AddError("serviceId", "Smtp service with specified id does not exist");
			}

			//we set current record to store properties which don't exist in current entity 
			EntityRecord currentRecord = pageModel.DataModel.GetProperty("Record") as EntityRecord;
			currentRecord["recipient_email"] = recipientEmail;
			currentRecord["subject"] = subject;
			currentRecord["content"] = content;
			pageModel.DataModel.SetRecord(currentRecord);

			valEx.CheckAndThrow();

			try
			{
				smtpService.SendEmail(string.Empty, recipientEmail, subject, string.Empty, content);
				pageModel.TempData.Put("ScreenMessage", new ScreenMessage() { Message = "Email was successfully sent", Type = ScreenMessageType.Success, Title = "Success" });
				var returnUrl = pageModel.HttpContext.Request.Query["returnUrl"];
				return new RedirectResult($"/mail/services/smtp/r/{smtpService.Id}/details?returnUrl={returnUrl}");
			}
			catch (Exception ex)
			{
				valEx.AddError("", ex.Message);
				valEx.CheckAndThrow();
				return null;
			}
		}

		public IActionResult EmailSendNowOnPost(RecordDetailsPageModel pageModel)
		{
			var emailId = (Guid)pageModel.DataModel.GetProperty("Record.id");

			var internalSmtpSrv = new SmtpInternalService();
			Email email = internalSmtpSrv.GetEmail(emailId);
			SmtpService smtpService = new ServiceManager().GetSmtpService(email.ServiceId);
			internalSmtpSrv.SendEmail(email, smtpService);

			if (email.Status == EmailStatus.Sent)
				pageModel.TempData.Put("ScreenMessage", new ScreenMessage() { Message = "Email was successfully sent", Type = ScreenMessageType.Success, Title = "Success" });
			else
				pageModel.TempData.Put("ScreenMessage", new ScreenMessage() { Message = email.ServerError, Type = ScreenMessageType.Error, Title = "Error" });

			var returnUrl = pageModel.HttpContext.Request.Query["returnUrl"];
			return new RedirectResult($"/mail/emails/all/r/{emailId}/details?returnUrl={returnUrl}");
		}

		#endregion

		public void SaveEmail(Email email)
		{
			PrepareEmailXSearch(email);
			RecordManager recMan = new RecordManager();
			var response = recMan.Find(new EntityQuery("email", "*", EntityQuery.QueryEQ("id", email.Id)));
			if (response.Object != null && response.Object.Data != null && response.Object.Data.Count != 0)
				recMan.UpdateRecord("email", email.MapTo<EntityRecord>());
			else
				recMan.CreateRecord("email", email.MapTo<EntityRecord>());
		}

		public Email GetEmail(Guid id)
		{
			var result = new EqlCommand("SELECT * FROM email WHERE id = @id", new EqlParameter("id", id)).Execute();
			if (result.Count == 1)
				return result[0].MapTo<Email>();

			return null;
		}

		internal void PrepareEmailXSearch(Email email)
		{
			email.XSearch = $"{email.SenderName} {email.SenderEmail} {email.RecipientEmail} {email.RecipientName} {email.Subject} {email.ContentText} {email.ContentHtml}";
		}

		internal void SendEmail(Email email, SmtpService service)
		{
			try
			{

				if (service == null)
				{
					email.ServerError = "SMTP service not found";
					email.Status = EmailStatus.Aborted;
					return; //save email in finally block will save changes
				}
				else if (!service.IsEnabled)
				{
					email.ServerError = "SMTP service is not enabled";
					email.Status = EmailStatus.Aborted;
					return; //save email in finally block will save changes
				}

				var message = new MimeMessage();
				if (!string.IsNullOrWhiteSpace(email.SenderName))
					message.From.Add(new MailboxAddress(email.SenderName, email.SenderEmail));
				else
					message.From.Add(new MailboxAddress(email.SenderEmail));

				if (!string.IsNullOrWhiteSpace(email.RecipientName))
					message.To.Add(new MailboxAddress(email.RecipientName, email.RecipientEmail));
				else
					message.To.Add(new MailboxAddress(email.RecipientEmail));

				if (!string.IsNullOrWhiteSpace(email.ReplyToEmail))
					message.ReplyTo.Add(new MailboxAddress(email.ReplyToEmail));

				message.Subject = email.Subject;

				var bodyBuilder = new BodyBuilder();
				bodyBuilder.HtmlBody = email.ContentHtml;
				bodyBuilder.TextBody = email.ContentText;
				message.Body = bodyBuilder.ToMessageBody();

				using (var client = new SmtpClient())
				{
					//accept all SSL certificates (in case the server supports STARTTLS)
					client.ServerCertificateValidationCallback = (s, c, h, e) => true;

					client.Connect(service.Server, service.Port, service.ConnectionSecurity);

					if (!string.IsNullOrWhiteSpace(service.Username))
						client.Authenticate(service.Username, service.Password);

					client.Send(message);
					client.Disconnect(true);
				}
				email.SentOn = DateTime.UtcNow;
				email.Status = EmailStatus.Sent;
				email.ScheduledOn = null;
				email.ServerError = null;
			}
			catch (Exception ex)
			{
				email.SentOn = null;
				email.ServerError = ex.Message;
				email.RetriesCount++;
				if (email.RetriesCount >= service.MaxRetriesCount)
				{
					email.ScheduledOn = null;
					email.Status = EmailStatus.Aborted;
				}
				else
				{
					email.ScheduledOn = DateTime.UtcNow.AddMinutes(service.RetryWaitMinutes);
					email.Status = EmailStatus.Pending;
				}

			}
			finally
			{
				new SmtpInternalService().SaveEmail(email);
			}
		}

		public void ProcessSmtpQueue()
		{
			lock (lockObject)
			{
				if (queueProcessingInProgress)
					return;

				queueProcessingInProgress = true;
			}

			try
			{
				List<Email> pendingEmails = new List<Email>();
				do
				{
					ServiceManager serviceManager = new ServiceManager();

					pendingEmails = new EqlCommand("SELECT * FROM email WHERE status = @status AND scheduled_on <> NULL" +
													" AND scheduled_on < @scheduled_on  ORDER BY priority DESC, scheduled_on ASC PAGE 1 PAGESIZE 10",
								new EqlParameter("status", ((int)EmailStatus.Pending).ToString()),
								new EqlParameter("scheduled_on", DateTime.UtcNow)).Execute().MapTo<Email>();

					foreach (var email in pendingEmails)
					{
						var service = serviceManager.GetSmtpService(email.ServiceId);
						if (service == null)
						{
							email.Status = EmailStatus.Aborted;
							email.ServerError = "SMTP service not found.";
							email.ScheduledOn = null;
							SaveEmail(email);
							continue;
						}
						else
						{
							SendEmail(email, service);
						}
					}
				}
				while (pendingEmails.Count > 0);

			}
			finally
			{
				lock (lockObject)
				{
					queueProcessingInProgress = false;
				}
			}
		}
	}
}
