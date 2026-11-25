import React from "react";
import MyWorkspace from "../../components/workspace/MyWorkspace";

export default function WorkspaceHome() {
  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Welcome Banner */}
      <div className="bg-[#111111] border border-white/[0.08] rounded-2xl py-6 px-7 shadow-xl flex items-center flex-shrink-0">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          Welcome To Your WorkSpace!
        </h1>
      </div>

      <MyWorkspace />
    </div>
  );
}
