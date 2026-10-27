import { useState } from "react";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { useHistoryLogger } from "@/hooks/useHistoryLogger";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { DoorCard } from "@/components/DoorCard";
import { StatusCard } from "@/components/StatusCard";
import { EnvironmentGauge } from "@/components/EnvironmentGauge";
import { ParkingSection } from "@/components/ParkingSection";
import { ControlCard } from "@/components/ControlCard";
import { SoilMoistureCard } from "@/components/SoilMoistureCard";
import { ChatBot } from "@/components/ChatBot";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import {
  Lightbulb,
  Fan,
  Blinds,
  Droplet,
  Flame,
} from "lucide-react";

const sectionTitles: Record<string, string> = {
  overview: "Dashboard",
  doors: "Door & Security",
  environment: "Environment & Automation",
  parking: "Parking & Gate",
};

const Index = () => {
  const { data, connected } = useFirebaseData();
  const [activeSection, setActiveSection] = useState("overview");
  useHistoryLogger(data.temperature, data.humidity);

  const gasHigh = data.gasValue > 500;
  const gasStatus = gasHigh ? "alert" : "active";

  const renderDoors = () => (
    <section className="mb-6 sm:mb-8">
      <h3 className="section-label mb-3 sm:mb-4 flex items-center gap-2">
        <div className="w-1 h-3 rounded-full bg-primary" />
        Door & Security
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <DoorCard label="Main Door" access={data.main_door.access} doorState={data.main_door.door_state} userName={data.main_door.user_name} index={0} />
      </div>
    </section>
  );

  const renderEnvironment = () => (
    <section className="mb-6 sm:mb-8">
      <h3 className="section-label mb-3 sm:mb-4 flex items-center gap-2">
        <div className="w-1 h-3 rounded-full bg-primary" />
        Environment & Automation
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <EnvironmentGauge temperature={data.temperature} humidity={data.humidity} />
        <ControlCard title="Lamp" icon={Lightbulb} value={data.lamp} firebaseKey="lamp" index={1} />
        <ControlCard title="Fan" icon={Fan} value={data.fan} firebaseKey="fan" index={2} />
        <ControlCard
          title="Curtains"
          icon={Blinds}
          value={data.curtains}
          firebaseKey="curtains"
          options={["Open", "Closed", "Partial"]}
          offLabel="Closed"
          index={3}
        />
        <ControlCard title="Water Pump" icon={Droplet} value={data.water_pump} firebaseKey="water_pump" index={4} />
        <SoilMoistureCard value={data.soil_moisture} index={5} />
        <StatusCard
          title="Gas Sensor"
          icon={Flame}
          value={gasHigh ? `High (${data.gasValue})` : "Safe"}
          status={gasStatus}
          subtitle={gasHigh ? "⚠️ Gas level too high!" : `Level: ${data.gasValue}`}
          index={6}
        />
      </div>
    </section>
  );

  const renderParking = () => (
    <section className="mb-6 sm:mb-8">
      <h3 className="section-label mb-3 sm:mb-4 flex items-center gap-2">
        <div className="w-1 h-3 rounded-full bg-primary" />
        Parking & Gate
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <ParkingSection slot1={data.parking.slot1} slot2={data.parking.slot2} gateState={data.parking.gate} />
      </div>
    </section>
  );

  return (
    <div className="flex min-h-screen bg-background bg-mesh">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <DashboardHeader
          connected={connected}
          lastCommand={data.gsm_last_command}
          title={sectionTitles[activeSection] || "Dashboard"}
        />

        {activeSection === "overview" && (
          <>
            {renderDoors()}
            {renderEnvironment()}
            {renderParking()}
          </>
        )}
        {activeSection === "doors" && renderDoors()}
        {activeSection === "environment" && renderEnvironment()}
        {activeSection === "parking" && renderParking()}
      </main>

      <ChatBot homeData={data} />
      <VoiceAssistant homeData={data} />
    </div>
  );
};

export default Index;
