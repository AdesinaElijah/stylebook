package com.stylebook.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SmsService {

    @Value("${twilio.account.sid:}")
    private String accountSid;

    @Value("${twilio.auth.token:}")
    private String authToken;

    @Value("${twilio.phone.number:}")
    private String fromPhoneNumber;

    public boolean sendSms(String toPhoneNumber, String messageBody) {
        if (accountSid.isBlank() || authToken.isBlank() || fromPhoneNumber.isBlank()) {
            log.info("Twilio SMS is not configured; skipping SMS send");
            return false;
        }

        try {
            Twilio.init(accountSid, authToken);
            Message.creator(
                    new PhoneNumber(toPhoneNumber),
                    new PhoneNumber(fromPhoneNumber),
                    messageBody
            ).create();
            return true;
        } catch (Exception e) {
            log.warn("Unable to send SMS to {}", toPhoneNumber, e);
            return false;
        }
    }
}
