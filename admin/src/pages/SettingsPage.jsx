import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Instagram, Star, Facebook, Youtube, MessageCircle, MapPin, Clock,
  Phone, Mail, Wifi, ExternalLink, Globe, Save, Store,
} from "lucide-react";
import { getSettings, updateSettings } from "../services/settingsService";
import { queryClient } from "../lib/queryClient";
import { errorMessage } from "../lib/errors";
import PageHeader from "../components/ui/PageHeader";
import ErrorState from "../components/ui/ErrorState";
import Field from "../components/ui/Field";

const LINK_FIELDS = [
  { key: "instagram_url", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/moba.cafe", hint: "Full URL to your Instagram profile" },
  { key: "google_review_url", label: "Google Reviews", icon: Star, placeholder: "https://g.page/r/YOUR_ID/review", hint: "Google review link — customers tap to leave a review" },
  { key: "facebook_url", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/moba.cafe", hint: "Your Facebook page URL" },
  { key: "youtube_url", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@moba", hint: "YouTube channel URL" },
  { key: "zomato_url", label: "Zomato", icon: ExternalLink, placeholder: "https://zomato.com/restaurant/moba", hint: "Your Zomato listing page" },
  { key: "swiggy_url", label: "Swiggy", icon: ExternalLink, placeholder: "https://swiggy.com/restaurants/moba", hint: "Your Swiggy listing page" },
];

const INFO_FIELDS = [
  { key: "whatsapp_number", label: "WhatsApp Number", icon: MessageCircle, placeholder: "+91 98765 43210", hint: "Include country code. Used for 'Chat with us' links." },
  { key: "contact_phone", label: "Phone Number", icon: Phone, placeholder: "+91 44 2345 6789", hint: "Displayed on the menu site for reservations" },
  { key: "contact_email", label: "Email", icon: Mail, placeholder: "hello@moba.cafe", hint: "Contact email shown on the site" },
  { key: "address", label: "Address", icon: MapPin, placeholder: "123 Anna Nagar, Chennai 600040", hint: "Full restaurant address" },
  { key: "map_url", label: "Google Maps Link", icon: Globe, placeholder: "https://maps.app.goo.gl/xxxxx", hint: "'Find us' button opens this link" },
  { key: "hours_text", label: "Opening Hours", icon: Clock, placeholder: "Mon–Sun: 11 AM – 11 PM", hint: "Shown to customers on the menu site" },
  { key: "tagline", label: "Tagline / Message", icon: Store, placeholder: "같이 밥 먹어요 · Gather for food", hint: "Short line shown in the footer or visit section" },
  { key: "wifi_password", label: "WiFi Password", icon: Wifi, placeholder: "moba2026", hint: "Shown to dine-in customers (optional)" },
];

const ALL_KEYS = [...LINK_FIELDS, ...INFO_FIELDS].map((f) => f.key);

function LinkInput({ field, register, value }) {
  const Icon = field.icon;
  return (
    <Field label={field.label} hint={field.hint} optional>
      {(props) => (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
            <Icon size={16} />
          </span>
          <input
            {...props}
            {...register(field.key)}
            type="text"
            placeholder={field.placeholder}
            className="input pl-10"
          />
          {value && (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-cobalt transition-colors"
              title="Open link"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}
    </Field>
  );
}

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <div className="panel p-5 md:p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-orange-soft text-orange-ink">
          <Icon size={20} />
        </span>
        <div>
          <h2 className="text-title font-bold">{title}</h2>
          <p className="text-meta text-ink-3 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const { register, handleSubmit, reset, watch, formState: { isDirty } } = useForm();

  useEffect(() => {
    if (data) {
      const values = {};
      for (const key of ALL_KEYS) values[key] = data[key] || "";
      reset(values);
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (fields) => updateSettings(fields),
    onSuccess: () => {
      toast.success("Settings saved.");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onSubmit = (values) => {
    const fields = {};
    for (const key of ALL_KEYS) {
      const v = values[key]?.trim();
      fields[key] = v || null;
    }
    mutation.mutate(fields);
  };

  const watchAll = watch();

  if (error) {
    return (
      <>
        <PageHeader title="Settings" />
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Social links, contact info and placeholders shown on your menu site"
        actions={
          <button
            type="submit"
            form="settings-form"
            disabled={!isDirty || mutation.isPending}
            className="btn btn-primary"
          >
            <Save size={16} />
            {mutation.isPending ? "Saving…" : "Save changes"}
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-64 !rounded-[16px]" />
          <div className="skeleton h-80 !rounded-[16px]" />
        </div>
      ) : (
        <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-3xl">
          <SectionCard
            title="Social & Review Links"
            description="Add your social media and review platform links. These appear on the customer menu site footer and 'Visit' section."
            icon={Globe}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {LINK_FIELDS.map((f) => (
                <LinkInput key={f.key} field={f} register={register} value={watchAll[f.key]} />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Restaurant Info"
            description="Contact details, hours and other information shown to your customers."
            icon={Store}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {INFO_FIELDS.slice(0, 3).map((f) => (
                <LinkInput key={f.key} field={f} register={register} value={null} />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              {INFO_FIELDS.slice(3, 5).map((f) => (
                <LinkInput key={f.key} field={f} register={register} value={watchAll[f.key]} />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              {INFO_FIELDS.slice(5).map((f) => (
                <LinkInput key={f.key} field={f} register={register} value={null} />
              ))}
            </div>
          </SectionCard>

          <div className="panel p-5 md:p-6 bg-cobalt-soft/30 border-cobalt/20">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-cobalt-soft text-cobalt-ink">
                <ExternalLink size={20} />
              </span>
              <div>
                <h3 className="text-body font-bold">How it works</h3>
                <ul className="text-meta text-ink-2 mt-1.5 space-y-1">
                  <li>Links you add here appear on the customer-facing menu site — in the footer, the "Visit" section, and social icons.</li>
                  <li>Leave a field empty to hide it. Only filled fields are shown to customers.</li>
                  <li>The Google Reviews link lets diners leave a review with one tap from the menu.</li>
                  <li>WhatsApp opens a chat — great for reservations and feedback.</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
