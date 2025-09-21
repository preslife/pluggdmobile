import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const linkBase = "px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground";

export default function AdminLayout() {
  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="text-muted-foreground">Manage users, labels, content, commerce, and platform settings</p>
        </div>
        <div className="flex flex-col gap-3 mb-6 md:flex-row md:flex-wrap">
          <NavLink to="/admin" end className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Dashboard</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Users</NavLink>
          <NavLink to="/admin/labels" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Labels</NavLink>
          <NavLink to="/admin/roles" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Roles</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Users</NavLink>
          <NavLink to="/admin/catalog" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Catalog</NavLink>
          <NavLink to="/admin/catalog/moderation" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Moderation</NavLink>
          <NavLink to="/admin/financials" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Financials</NavLink>
          <NavLink to="/admin/distribution" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Distribution</NavLink>
          <NavLink to="/admin/courses" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Courses</NavLink>
          <NavLink to="/admin/content" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Content</NavLink>
          <NavLink to="/admin/events" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Events</NavLink>
          <NavLink to="/admin/analytics" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Analytics</NavLink>
          <NavLink to="/admin/security" className={({ isActive }) => cn(linkBase, isActive && "bg-primary text-primary-foreground")}>Settings</NavLink>
        </div>
        <div className="pb-12">
          <Outlet />
        </div>
      </div>
    </div>
  );
}


