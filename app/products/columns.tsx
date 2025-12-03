"use client";

import { Product } from "@/app/types";
import { Column, ColumnDef } from "@tanstack/react-table";
//import { ReactNode } from "react";

import ProductDropDown from "./ProductsDropDown";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { QRCodeHover } from "@/components/ui/qr-code-hover";
import { AlertTriangle, ArrowUpDown } from "lucide-react";
import { IoMdArrowDown, IoMdArrowUp } from "react-icons/io";
import Link from "next/link";

type SortableHeaderProps = {
  column: Column<Product, unknown>;
  label: string;
};

const SortableHeader: React.FC<SortableHeaderProps> = ({ column, label }) => {
  const isSorted = column.getIsSorted();
  const SortingIcon =
    isSorted === "asc"
      ? IoMdArrowUp
      : isSorted === "desc"
        ? IoMdArrowDown
        : ArrowUpDown;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="" asChild>
        <div
          className={`flex items-start py-[14px] select-none cursor-pointer p-2 gap-1 ${isSorted && "text-primary"
            }`}
          aria-label={`Sort by ${label}`}
        >
          {label}
          <SortingIcon className="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom">
        {/* Ascending Sorting */}
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <IoMdArrowUp className="mr-2 h-4 w-4" />
          Asc
        </DropdownMenuItem>
        {/* Descending Sorting */}
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <IoMdArrowDown className="mr-2 h-4 w-4" />
          Desc
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <SortableHeader column={column} label="Created At" />
    ),
    cell: ({ getValue }) => {
      const dateValue = getValue<string | Date>();
      const date =
        typeof dateValue === "string" ? new Date(dateValue) : dateValue;

      if (!date || isNaN(date.getTime())) {
        return <span>Unknown Date</span>;
      }

      return (
        <span>
          {date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "name",
    cell: ({ row }) => {
      const name = row.original.name;
      const id = row.original.id;
      const hasVariants = row.original.hasVariants;
      return (
        <div className="flex items-center gap-2">
          <Link 
            href={`/products/${id}`}
            className="hover:underline hover:text-primary font-medium"
          >
            {name}
          </Link>
          {hasVariants && (
            <Badge variant="secondary" className="text-xs">
              Has Variants
            </Badge>
          )}
        </div>
      );
    },
    header: ({ column }) => <SortableHeader column={column} label="Name" />,
  },
  {
    accessorKey: "sku",
    header: ({ column }) => <SortableHeader column={column} label="SKU" />,
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => <SortableHeader column={column} label="Stock" />,
    cell: ({ row }) => {
      const product = row.original;
      // Quantity is computed from variants, which get their stock from purchase orders
      const quantity = product.quantity;
      const reorderPoint = product.reorderPoint ?? product.minStock;
      const isOutOfStock = quantity <= 0;
      const isLowStock =
        !isOutOfStock && typeof reorderPoint === "number" && quantity <= reorderPoint;

      return (
        <div className="flex items-center gap-2">
          <span className={isLowStock || isOutOfStock ? "font-semibold" : ""}>
            {quantity}
          </span>
          {isLowStock && (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          )}
          {isOutOfStock && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "defaultWarehouseName",
    header: "Warehouse",
    cell: ({ row }) => row.original.defaultWarehouseName || "—",
  },
  {
    accessorKey: "reorderPoint",
    header: "Reorder Point",
    cell: ({ row }) => row.original.reorderPoint ?? "—",
  },
  {
    accessorKey: "price",
    header: ({ column }) => <SortableHeader column={column} label="Selling Price" />,
    cell: ({ row }) => {
      const product = row.original;
      // Price is computed from active variants
      const hasVariants = product.hasVariants && product.variants && product.variants.length > 0;
      
      if (hasVariants) {
        const activeVariants = product.variants!.filter(v => v.isActive);
        if (activeVariants.length === 0) {
          return <span className="text-muted-foreground">No pricing</span>;
        }
        
        const prices = activeVariants.map(v => v.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        if (minPrice === maxPrice) {
          return `$${minPrice.toFixed(2)}`;
        }
        return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
      }
      
      // For products without variants, show computed price (from API)
      const price = product.price || 0;
      if (price === 0) {
        return <span className="text-muted-foreground">No pricing</span>;
      }
      return `$${price.toFixed(2)}`;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} label="Status" />,
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      const reorderPoint = row.original.reorderPoint ?? row.original.minStock;
      let status = "";
      let colorClass = "";

      if (quantity <= 0) {
        status = "Stock Out";
        colorClass = "bg-red-100 text-red-600";
      } else if (typeof reorderPoint === "number" && quantity <= reorderPoint) {
        status = "Stock Low";
        colorClass = "bg-orange-100 text-orange-600";
      } else {
        status = "Available";
        colorClass = "bg-green-100 text-green-600";
      }

      return (
        <span
          className={`px-3 py-[2px] rounded-full font-medium ${colorClass} flex gap-1 items-center w-fit`}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const categoryName = row.original.category;
      return <span>{categoryName || "Unknown"}</span>;
    },
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => {
      const supplierName = row.original.supplier; // Display supplier name
      return <span>{supplierName || "Unknown"}</span>;
    },
  },
  {
    id: "qrCode",
    header: "QR Code",
    cell: ({ row }) => {
      const product = row.original;
      // QR code contains product identification info only
      const qrData = JSON.stringify({
        id: product.id,
        name: product.name,
        sku: product.sku,
        status: product.status,
        category: product.category,
        supplier: product.supplier,
      });

      return (
        <QRCodeHover
          data={qrData}
          title={`${product.name} QR`}
          size={200}
        />
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return <ProductDropDown row={row} />;
    },
  },
];

// Debug log for columns - only log in development
if (process.env.NODE_ENV === 'development') {
  console.log("Columns passed to useReactTable:", columns);
}
