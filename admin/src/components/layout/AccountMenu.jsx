import { useEffect, useState } from "react";
import { LogOut, Volume2, VolumeX, RotateCcw, ChevronsUpDown } from "lucide-react";
import Menu, { MenuItem, MenuSeparator, MenuLabel } from "../ui/Menu";
import { useAuth } from "../../context/AuthContext";
import { signOut } from "../../services/authService";
import { isSoundEnabled, setSoundEnabled, unlockAudio } from "../../hooks/useLiveOrders";
import { isDemo } from "../../lib/demo";
import toast from "react-hot-toast";

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "M";
}

export function useSound() {
  const [sound, setSound] = useState(isSoundEnabled());
  useEffect(() => {
    const on = (e) => setSound(!!e.detail);
    window.addEventListener("moba:sound", on);
    return () => window.removeEventListener("moba:sound", on);
  }, []);
  const toggle = () => {
    const on = !sound;
    setSoundEnabled(on);
    if (on) unlockAudio();
    toast(on ? "Sound on for new orders." : "New-order sound off.", { id: "sound" });
  };
  return [sound, toggle];
}

// Always-visible new-order sound control: a muted counter tablet is a missed order.
export function SoundToggle({ compact }) {
  const [sound, toggle] = useSound();
  const Icon = sound ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={sound}
      aria-label={sound ? "New-order sound is on. Turn off" : "New-order sound is off. Turn on"}
      title={sound ? "New-order sound on" : "New-order sound off"}
      className={`btn ${compact ? "btn-icon btn-sm" : ""} ${sound ? "btn-secondary" : "btn-secondary !text-ink-3"}`}
    >
      <Icon size={compact ? 16 : 17} className={sound ? "text-green-ink" : ""} />
      {!compact && <span className="hidden sm:inline">{sound ? "Sound on" : "Sound off"}</span>}
    </button>
  );
}

export default function AccountMenu({ compact }) {
  const { staff, session } = useAuth();
  const [sound, toggleSound] = useSound();
  const name = staff?.display_name || session?.user?.email || "Staff";

  return (
    <Menu
      label="Account"
      align={compact ? "start" : "end"}
      width={240}
      trigger={(p) => (
        <button
          {...p}
          className={`flex items-center gap-2.5 rounded-[12px] text-left transition-colors hover:bg-hover ${
            compact ? "h-10 w-10 justify-center" : "w-full p-2"
          }`}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-cobalt-ink text-cap font-bold">
            {initials(name)}
          </span>
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-meta font-bold">{name}</span>
                <span className="block truncate text-cap text-ink-3 capitalize">{isDemo ? "Demo owner" : staff?.role || "Staff"}</span>
              </span>
              <ChevronsUpDown size={15} className="text-ink-3" />
            </>
          )}
        </button>
      )}
    >
      <MenuLabel>{session?.user?.email || name}</MenuLabel>
      <MenuItem icon={sound ? Volume2 : VolumeX} onSelect={toggleSound} hint={sound ? "On" : "Off"}>
        New-order sound
      </MenuItem>
      {isDemo && (
        <MenuItem
          icon={RotateCcw}
          onSelect={() =>
            import("../../demo/store").then(({ resetDemo }) => {
              resetDemo();
              toast.success("Demo data reset.");
            })
          }
        >
          Reset demo data
        </MenuItem>
      )}
      <MenuSeparator />
      <MenuItem icon={LogOut} onSelect={() => signOut()}>
        {isDemo ? "Leave demo" : "Sign out"}
      </MenuItem>
    </Menu>
  );
}
