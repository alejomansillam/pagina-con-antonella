insert into public.official_files (key, file_path, file_name, updated_by_name, updated_at)
values ('libre-deuda-html', 'libre-deuda-html/Constancia_y_Libre_de_Deuda.html', 'Constancia y Libre de Deuda.html', 'Equipo del estudio', now())
on conflict (key) do update
set file_path = excluded.file_path,
    file_name = excluded.file_name,
    updated_by_name = excluded.updated_by_name,
    updated_at = excluded.updated_at;