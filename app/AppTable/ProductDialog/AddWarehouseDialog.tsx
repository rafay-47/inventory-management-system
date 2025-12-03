"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProductStore } from "@/app/useProductStore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/authContext";
import axiosInstance from "@/utils/axiosInstance";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function AddWarehouseDialog() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(
    null
  );
  const [editingFields, setEditingFields] = useState({
    name: "",
    code: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    warehouses,
    addWarehouse,
    editWarehouse,
    deleteWarehouse,
    loadWarehouses,
  } = useProductStore();
  const { toast } = useToast();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      loadWarehouses();
    }
  }, [isLoggedIn, loadWarehouses]);

  if (!isLoggedIn) {
    return null;
  }

  const resetForm = () => {
    setName("");
    setCode("");
    setAddress("");
  };

  const handleAddWarehouse = async () => {
    if (name.trim() === "") {
      toast({
        title: "Warehouse name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post("/warehouses", {
        name,
        code: code.trim() || null,
        address: address.trim() || null,
      });

      addWarehouse(response.data);
      toast({
        title: "Warehouse created",
        description: `"${name}" is now available for assignment.`,
      });
      resetForm();
    } catch (error: any) {
      toast({
        title: "Failed to create warehouse",
        description: error.response?.data?.error || "Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (warehouseId: string) => {
    const target = warehouses.find((wh) => wh.id === warehouseId);
    if (!target) return;
    setEditingWarehouseId(warehouseId);
    setEditingFields({
      name: target.name || "",
      code: target.code || "",
      address: target.address || "",
    });
  };

  const handleEditWarehouse = async () => {
    if (!editingWarehouseId) return;
    if (editingFields.name.trim() === "") {
      toast({
        title: "Warehouse name is required",
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    try {
      const response = await axiosInstance.put("/warehouses", {
        id: editingWarehouseId,
        name: editingFields.name.trim(),
        code: editingFields.code.trim() || null,
        address: editingFields.address.trim() || null,
      });

      editWarehouse(editingWarehouseId, response.data);
      toast({
        title: "Warehouse updated",
        description: `"${response.data.name}" has been updated.`,
      });
      setEditingWarehouseId(null);
    } catch (error: any) {
      toast({
        title: "Failed to update warehouse",
        description: error.response?.data?.error || "Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteWarehouse = async (warehouseId: string) => {
    setIsDeleting(true);
    const target = warehouses.find((wh) => wh.id === warehouseId);
    try {
      await axiosInstance.delete("/warehouses", { data: { id: warehouseId } });
      deleteWarehouse(warehouseId);
      toast({
        title: "Warehouse deleted",
        description: target?.name ? `"${target.name}" was removed.` : undefined,
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete warehouse",
        description: error.response?.data?.error || "Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-10 font-semibold">+Add Warehouse</Button>
      </DialogTrigger>
      <DialogContent className="p-4 sm:p-7 sm:px-8 poppins max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[22px]">Add Warehouse</DialogTitle>
          <DialogDescription>
            Create or manage the warehouses where you stock inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Warehouse name"
          />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code (optional)"
          />
          <Textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address (optional)"
          />
        </div>
        <DialogFooter className="mt-6 flex flex-col sm:flex-row items-center gap-4">
          <DialogClose asChild>
            <Button variant="secondary" className="h-11 w-full sm:w-auto px-11">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleAddWarehouse}
            className="h-11 w-full sm:w-auto px-11"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Add Warehouse"}
          </Button>
        </DialogFooter>
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Existing Warehouses</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                className="p-4 border rounded-lg shadow-sm space-y-3"
              >
                {editingWarehouseId === warehouse.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editingFields.name}
                      onChange={(e) =>
                        setEditingFields({ ...editingFields, name: e.target.value })
                      }
                      placeholder="Warehouse name"
                    />
                    <Input
                      value={editingFields.code}
                      onChange={(e) =>
                        setEditingFields({ ...editingFields, code: e.target.value })
                      }
                      placeholder="Code (optional)"
                    />
                    <Textarea
                      value={editingFields.address}
                      onChange={(e) =>
                        setEditingFields({
                          ...editingFields,
                          address: e.target.value,
                        })
                      }
                      placeholder="Address (optional)"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="h-8 w-full"
                        onClick={handleEditWarehouse}
                        disabled={isEditing}
                      >
                        {isEditing ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        className="h-8 w-full"
                        onClick={() => setEditingWarehouseId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold">{warehouse.name}</p>
                      {warehouse.code && (
                        <p className="text-sm text-muted-foreground">
                          Code: {warehouse.code}
                        </p>
                      )}
                      {warehouse.address && (
                        <p className="text-sm text-muted-foreground">
                          {warehouse.address}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="h-8 w-full"
                        onClick={() => startEditing(warehouse.id)}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        className="h-8 w-full"
                        onClick={() => handleDeleteWarehouse(warehouse.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : <FaTrash />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {warehouses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No warehouses yet. Create one above to get started.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
