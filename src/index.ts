import {
  Adapter,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
  ServerError,
  start,
} from "@clinq/bridge";
import { createContactsModule, sipgateIO, SipgateIOClient } from "sipgateio";
import * as uuid from "uuid";
import { Scope, SIPGATE_TEAM_CONTACTS_URL } from "./constants";
import { createContactFromContactResponse } from "./utils";

function sipgateClientFromConfig(config: Config): SipgateIOClient {
  const client = sipgateIO({
    tokenId: config.apiKey.split(":")[0],
    token: config.apiKey.split(":")[1],
  });
  return client;
}

class SipgateTeamAdapter implements Adapter {
  /**
   * Fetching contacts from sipgate Team using the sipgateIO node library
   */
  public async getContacts(config: Config): Promise<Contact[]> {
    const client = createContactsModule(sipgateClientFromConfig(config));

    try {
      const contacts = await client.get("ALL");

      const responseContacts = contacts.filter(
        (contact) => contact.scope === "SHARED" || contact.scope === "PRIVATE"
      );

      return responseContacts.map(createContactFromContactResponse);
    } catch (error) {
      const status = error.response?.status || 500;
      console.error(`Could not get contacts (${status}):`, error.message);
      throw new ServerError(status, `Could not get contacts: ${error.message}`);
    }
  }

  public async createContact(
    config: Config,
    contact: ContactTemplate
  ): Promise<Contact> {
    const client = createContactsModule(sipgateClientFromConfig(config));

    const id = uuid.v4();

    try {
      await client.update({
        id,
        name: this.selectName(contact),
        emails: contact.email ? [{ email: contact.email, type: ["WORK"] }] : [],
        organization: contact.organization ? [[contact.organization, ""]] : [],
        numbers: contact.phoneNumbers.map((phoneNumber) => ({
          number: phoneNumber.phoneNumber,
          type: ["WORK"],
        })),
        scope: "SHARED",
        picture: null,
        addresses: [],
      });
      return {
        id,
        ...contact,
        contactUrl: SIPGATE_TEAM_CONTACTS_URL,
        avatarUrl: null,
      };
    } catch (error) {
      const status = error.response?.status || 500;
      console.error(`Could not create contact (${status}):`, error.message);
      throw new ServerError(
        status,
        `Could not create contact: ${error.message}`
      );
    }
  }

  private selectName(contact: ContactUpdate | ContactTemplate): string {
    if (contact.name !== "" && contact.name !== null) {
      return contact?.name;
    } else if (contact.firstName !== "" || contact.lastName !== "") {
      return `${contact.firstName} ${contact.lastName}`;
    }

    return "";
  }

  public async updateContact(
    config: Config,
    id: string,
    contact: ContactUpdate
  ) {
    const client = createContactsModule(sipgateClientFromConfig(config));

    try {
      const contacts = await client.get("SHARED");

      const oldContact = contacts.find(
        (findContact) => findContact.id === contact.id
      );

      const oldContactEmailType = oldContact?.emails.find(
        (email) => email.email === contact.email
      )?.type;

      const payload = {
        id,
        name: this.selectName(contact),
        emails: contact.email
          ? [{ email: contact.email, type: oldContactEmailType || ["WORK"] }]
          : [],
        organization: contact.organization ? [[contact.organization, ""]] : [],
        numbers: contact.phoneNumbers.map((phoneNumber) => ({
          number: phoneNumber.phoneNumber,
          type: oldContact?.numbers.find(
            (findNumber) => findNumber.number === phoneNumber.phoneNumber
          )?.type || ["WORK"],
        })),
        scope: "SHARED" as Scope,
        picture: oldContact?.picture || null,
        addresses: oldContact?.addresses || [],
      };

      await client.update(payload);

      return {
        ...contact,
        contactUrl: SIPGATE_TEAM_CONTACTS_URL,
        avatarUrl: null,
      };
    } catch (error) {
      const status = error.response?.status || 500;
      console.error(`Could not update contact (${status}):`, error.message);
      throw new ServerError(
        status,
        `Could not update contact: ${error.message}`
      );
    }
  }

  public async deleteContact(config: Config, id: string): Promise<void> {
    const client = createContactsModule(sipgateClientFromConfig(config));

    try {
      await client.delete(id);
    } catch (error) {
      const status = error.response?.status || 500;
      console.error(`Could not delete contact (${status}):`, error.message);
      throw new ServerError(
        status,
        `Could not delete contact: ${error.message}`
      );
    }
  }
}

start(new SipgateTeamAdapter());
