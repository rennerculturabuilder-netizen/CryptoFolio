import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiUnauthorized() {
  return apiError("Não autenticado", 401);
}

export function apiForbidden() {
  return apiError("Acesso negado", 403);
}

export function apiNotFound(resource = "Recurso") {
  return apiError(`${resource} não encontrado`, 404);
}

export function apiServerError(error: unknown, context?: string) {
  console.error(context ? `[${context}]` : "[API Error]", error);
  return apiError("Erro interno do servidor", 500);
}

export function handleApiError(error: unknown, context?: string) {
  if (error instanceof Error) {
    if (error.message === "Portfolio not found") return apiNotFound("Portfolio");
    if (error.message === "Forbidden") return apiForbidden();
    if (error.message === "Unauthorized") return apiUnauthorized();
  }
  return apiServerError(error, context);
}
