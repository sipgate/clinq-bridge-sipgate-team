import { Contact, PhoneNumberLabel } from "@clinq/bridge";
import { ContactResponse } from "sipgateio";
import { SIPGATE_TEAM_CONTACTS_URL } from "./constants";

export const createContactFromContactResponse = (
  contact: ContactResponse
): Contact => {
  return {
    id: contact.id,
    name: contact.name,
    firstName: contact.name.split(" ")[0] || "",
    lastName: contact.name.split(" ")[1] || "",
    email: contact.emails.length > 0 ? contact.emails[0]?.email : "",
    organization:
      contact.organization[0] && contact.organization[0][0]
        ? contact.organization[0][0]
        : "",
    contactUrl: SIPGATE_TEAM_CONTACTS_URL,
    avatarUrl: "",
    phoneNumbers: contact.numbers.map((phoneNumber) => {
      return {
        label: PhoneNumberLabel.WORK,
        phoneNumber: phoneNumber.number,
      };
    }),
  };
};
