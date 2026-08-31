#import "NotificationService.h"

// OBH Skate Invites — Notification Service Extension.
// Downloads the image referenced by a push payload and attaches it so the
// notification shows the OBH crest (or any per-notification image). The app
// side only needs `mutableContent: true` + an image URL in the payload.

@interface NotificationService ()
@property (nonatomic, strong) void (^contentHandler)(UNNotificationContent *contentToDeliver);
@property (nonatomic, strong) UNMutableNotificationContent *bestAttemptContent;
@end

@implementation NotificationService

- (NSString *)imageURLStringFromUserInfo:(NSDictionary *)userInfo {
  if (![userInfo isKindOfClass:[NSDictionary class]]) {
    return nil;
  }

  // Expo Push Service nests the `data` object you send under "body".
  NSDictionary *data = [userInfo[@"body"] isKindOfClass:[NSDictionary class]] ? userInfo[@"body"] : nil;

  NSArray *candidates = @[
    userInfo[@"imageUrl"] ?: [NSNull null],
    (data[@"imageUrl"] ?: [NSNull null]),
    ([userInfo[@"richContent"] isKindOfClass:[NSDictionary class]] ? (userInfo[@"richContent"][@"image"] ?: [NSNull null]) : [NSNull null]),
    ((data && [data[@"richContent"] isKindOfClass:[NSDictionary class]]) ? (data[@"richContent"][@"image"] ?: [NSNull null]) : [NSNull null]),
  ];

  for (id value in candidates) {
    if ([value isKindOfClass:[NSString class]] && [(NSString *)value length] > 0) {
      return (NSString *)value;
    }
  }
  return nil;
}

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request
                   withContentHandler:(void (^)(UNNotificationContent *_Nonnull))contentHandler {
  self.contentHandler = contentHandler;
  self.bestAttemptContent = [request.content mutableCopy];

  NSString *urlString = [self imageURLStringFromUserInfo:request.content.userInfo];
  NSURL *imageURL = urlString ? [NSURL URLWithString:urlString] : nil;
  if (!imageURL) {
    self.contentHandler(self.bestAttemptContent);
    return;
  }

  NSURLSessionDownloadTask *task =
      [[NSURLSession sharedSession] downloadTaskWithURL:imageURL
                                     completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
        if (!error && location) {
          NSString *ext = imageURL.pathExtension.length ? imageURL.pathExtension : @"png";
          NSString *name = [NSString stringWithFormat:@"obh-nse-%@.%@", [NSUUID UUID].UUIDString, ext];
          NSURL *dest = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:name]];
          [[NSFileManager defaultManager] removeItemAtURL:dest error:nil];
          if ([[NSFileManager defaultManager] moveItemAtURL:location toURL:dest error:nil]) {
            UNNotificationAttachment *attachment =
                [UNNotificationAttachment attachmentWithIdentifier:@"image" URL:dest options:nil error:nil];
            if (attachment) {
              self.bestAttemptContent.attachments = @[ attachment ];
            }
          }
        }
        self.contentHandler(self.bestAttemptContent);
      }];
  [task resume];
}

- (void)serviceExtensionTimeWillExpire {
  self.contentHandler(self.bestAttemptContent);
}

@end
