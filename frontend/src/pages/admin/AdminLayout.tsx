import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ChatBot } from "@/components/ChatBot";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { useFirebaseData } from "@/hooks/useFirebaseData";

const AdminLayout = () => {
  const { data } = useFirebaseData();

  return (
    <div className="flex min-h-screen bg-background bg-mesh">
      <AdminSidebar />
      <main className="flex-1 p-4 pt-16 sm:p-6 sm:pt-16 lg:pt-8 lg:p-8 overflow-y-auto min-w-0">
        <Outlet />
      </main>
      <ChatBot homeData={data} />
      <VoiceAssistant homeData={data} />
    </div>
  );
};

export default AdminLayout;
