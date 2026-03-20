// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface TransferSenden {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    datei_1?: string;
    datei_2?: string;
    datei_3?: string;
    datei_4?: string;
    datei_5?: string;
    empfaenger_email_1?: string;
    empfaenger_email_2?: string;
    empfaenger_email_3?: string;
    absender_email?: string;
    absender_vorname?: string;
    absender_nachname?: string;
    nachricht?: string;
    ablaufdatum?: string; // Format: YYYY-MM-DD oder ISO String
    passwort_schutz?: boolean;
    passwort?: string;
  };
}

export interface Transfers {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    sender_vorname?: string;
    sender_nachname?: string;
    sender_email?: string;
    transfer_datei_1?: string;
    transfer_datei_2?: string;
    transfer_datei_3?: string;
    transfer_datei_4?: string;
    transfer_datei_5?: string;
    transfer_nachricht?: string;
    transfer_ablaufdatum?: string; // Format: YYYY-MM-DD oder ISO String
    transfer_link?: string;
    transfer_passwort_aktiv?: boolean;
    transfer_passwort?: string;
    transfer_status?: LookupValue;
  };
}

export interface Empfaenger {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    transfer_referenz?: string; // applookup -> URL zu 'Transfers' Record
    empfaenger_vorname?: string;
    empfaenger_nachname?: string;
    empfaenger_email?: string;
    download_status?: LookupValue;
    download_datum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  TRANSFER_SENDEN: '69bd62b274a02ce2c0b4b8d0',
  TRANSFERS: '69bd62b7b7f518cc6d7d58c1',
  EMPFAENGER: '69bd62b911d360b744ad78cb',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  transfers: {
    transfer_status: [{ key: "abgelaufen", label: "Abgelaufen" }, { key: "geloescht", label: "Gelöscht" }, { key: "aktiv", label: "Aktiv" }],
  },
  empfaenger: {
    download_status: [{ key: "nicht_heruntergeladen", label: "Nicht heruntergeladen" }, { key: "heruntergeladen", label: "Heruntergeladen" }, { key: "link_geoeffnet", label: "Link geöffnet" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'transfer_senden': {
    'datei_1': 'file',
    'datei_2': 'file',
    'datei_3': 'file',
    'datei_4': 'file',
    'datei_5': 'file',
    'empfaenger_email_1': 'string/email',
    'empfaenger_email_2': 'string/email',
    'empfaenger_email_3': 'string/email',
    'absender_email': 'string/email',
    'absender_vorname': 'string/text',
    'absender_nachname': 'string/text',
    'nachricht': 'string/textarea',
    'ablaufdatum': 'date/date',
    'passwort_schutz': 'bool',
    'passwort': 'string/text',
  },
  'transfers': {
    'sender_vorname': 'string/text',
    'sender_nachname': 'string/text',
    'sender_email': 'string/email',
    'transfer_datei_1': 'file',
    'transfer_datei_2': 'file',
    'transfer_datei_3': 'file',
    'transfer_datei_4': 'file',
    'transfer_datei_5': 'file',
    'transfer_nachricht': 'string/textarea',
    'transfer_ablaufdatum': 'date/date',
    'transfer_link': 'string/url',
    'transfer_passwort_aktiv': 'bool',
    'transfer_passwort': 'string/text',
    'transfer_status': 'lookup/select',
  },
  'empfaenger': {
    'transfer_referenz': 'applookup/select',
    'empfaenger_vorname': 'string/text',
    'empfaenger_nachname': 'string/text',
    'empfaenger_email': 'string/email',
    'download_status': 'lookup/select',
    'download_datum': 'date/datetimeminute',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateTransferSenden = StripLookup<TransferSenden['fields']>;
export type CreateTransfers = StripLookup<Transfers['fields']>;
export type CreateEmpfaenger = StripLookup<Empfaenger['fields']>;