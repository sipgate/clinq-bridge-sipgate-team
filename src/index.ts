import {
  Adapter,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
  PhoneNumberLabel,
  start,
} from "@clinq/bridge";
import * as uuid from "uuid";

const sipgateTeamContactsURL = "https://app.sipgate.com/team/contacts";

import {ContactResponse, createContactsModule, sipgateIO, SipgateIOClient} from "sipgateio";
import { Scope } from "sipgateio/dist/contacts";

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
    const client = sipgateClientFromConfig(config);

    const responseContacts = (await createContactsModule(client).get("ALL"))
        .filter(contact =>
              contact.scope === 'SHARED' || contact.scope === 'PRIVATE'
        );

    return responseContacts.map((contact) => {
      return this.createContactFromContactResponse(contact);
    });
  }

  private createContactFromContactResponse(contact: ContactResponse): Contact{
   return {
      id: contact.id,
          name: contact.name,
        firstName: "",
        lastName: "",
        email: contact.emails.length > 0 ? contact.emails[0]?.email : "",
        organization:
      contact.organization[0] && contact.organization[0][0]
          ? contact.organization[0][0]
          : "",
          contactUrl: sipgateTeamContactsURL,
        avatarUrl: "",
        phoneNumbers: contact.numbers.map((phoneNumber) => {
      return {
        label: PhoneNumberLabel.WORK,
        phoneNumber: phoneNumber.number,
      };
    }),
    };
  }

  public async createContact(
    config: Config,
    contact: ContactTemplate
  ): Promise<Contact> {
    const client = sipgateClientFromConfig(config);

    const id = uuid.v4();
    await createContactsModule(client).update({
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
      contactUrl: sipgateTeamContactsURL,
      avatarUrl: null,
    };
  }

  private selectName(contact: ContactUpdate | ContactTemplate): string{
    if (contact.name !== "" && contact.name !== null){
      return contact?.name;
    } else if(contact.firstName !== "" || contact.lastName !== ""){
      return `${contact.firstName} ${contact.lastName}`;
    }

    return '';
  }

  public async updateContact(
    config: Config,
    id: string,
    contact: ContactUpdate
  ) {
    const client = sipgateClientFromConfig(config);

    const oldContact = (await createContactsModule(client).get("SHARED")).find(
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
      scope: 'SHARED' as Scope,
      picture: oldContact?.picture || null,
      addresses: oldContact?.addresses || [],
    };

    console.log(JSON.stringify(payload));

    await createContactsModule(client).update(payload);
    return {
      ...contact,
      contactUrl: sipgateTeamContactsURL,
      avatarUrl: null,
    };
  }

  public async deleteContact(config: Config, id: string): Promise<void> {
    const client = sipgateClientFromConfig(config);

    await createContactsModule(client).delete(id);
  }
}

start(new SipgateTeamAdapter());
