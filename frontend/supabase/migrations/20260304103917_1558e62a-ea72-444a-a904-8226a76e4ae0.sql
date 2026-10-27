
-- Delete existing config rows and re-insert with rich metadata
DELETE FROM public.system_config;

INSERT INTO public.system_config (key, value) VALUES
('temp_threshold', '{"current": 35, "label": "Fan Auto-On Threshold (°C)", "description": "Fan activates automatically above this temperature", "type": "range", "group": "Temperature Control", "group_icon": "thermometer", "group_color": "warning", "min": 20, "max": 50, "unit": "°C", "order": 1}'::jsonb),
('gas_threshold', '{"current": "HIGH", "label": "Gas Alert Threshold", "description": "Sensitivity level for gas detection", "type": "select", "group": "Gas Alert", "group_icon": "flame", "group_color": "destructive", "options": ["LOW", "MEDIUM", "HIGH"], "order": 2}'::jsonb),
('parking_capacity', '{"current": 2, "label": "Parking Capacity", "description": "Maximum number of parking slots", "type": "counter", "group": "Parking", "group_icon": "car", "group_color": "info", "min": 1, "max": 10, "order": 3}'::jsonb),
('alert_sound', '{"current": true, "label": "Alert Sound", "description": "Play sound on gas or security alerts", "type": "toggle", "group": "Alerts & Overrides", "group_icon": "bell", "group_color": "accent", "order": 4}'::jsonb),
('manual_override', '{"current": false, "label": "Manual Override", "description": "Allow manual control of all automated devices", "type": "toggle", "group": "Alerts & Overrides", "group_icon": "bell", "group_color": "accent", "order": 5}'::jsonb);
