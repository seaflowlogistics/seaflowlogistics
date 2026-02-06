--
-- PostgreSQL database dump
--

\restrict o4pQG10laf3v5SxXcqdrJjSAhEvrhp0DEbEdgpIwuE5iY4NwhUKnQyAmVzp62D6

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public._migrations OWNER TO postgres;

--
-- Name: _migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public._migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public._migrations_id_seq OWNER TO postgres;

--
-- Name: _migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public._migrations_id_seq OWNED BY public._migrations.id;


--
-- Name: analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics (
    id integer NOT NULL,
    metric_type character varying(100) NOT NULL,
    metric_value numeric(12,2),
    date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.analytics OWNER TO postgres;

--
-- Name: analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analytics_id_seq OWNER TO postgres;

--
-- Name: analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.analytics_id_seq OWNED BY public.analytics.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id uuid,
    action character varying(255) NOT NULL,
    details text,
    entity_type character varying(50),
    entity_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: clearance_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clearance_schedules (
    id integer NOT NULL,
    job_id character varying(50),
    clearance_date date,
    clearance_type character varying(50),
    port character varying(100),
    bl_awb character varying(100),
    transport_mode character varying(50),
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    packages character varying(50),
    clearance_method character varying(50),
    reschedule_reason character varying(100),
    container_no character varying(255),
    container_type character varying(255)
);


ALTER TABLE public.clearance_schedules OWNER TO postgres;

--
-- Name: clearance_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clearance_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clearance_schedules_id_seq OWNER TO postgres;

--
-- Name: clearance_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clearance_schedules_id_seq OWNED BY public.clearance_schedules.id;


--
-- Name: consignees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consignees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    address text,
    code character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.consignees OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    address text,
    code character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type character varying(50) DEFAULT 'Individual'::character varying
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: delivery_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.delivery_agents OWNER TO postgres;

--
-- Name: delivery_note_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_note_items (
    id integer NOT NULL,
    delivery_note_id character varying(50),
    schedule_id integer,
    job_id character varying(50),
    shortage character varying(50),
    damaged character varying(50),
    remarks text
);


ALTER TABLE public.delivery_note_items OWNER TO postgres;

--
-- Name: delivery_note_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_note_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_note_items_id_seq OWNER TO postgres;

--
-- Name: delivery_note_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_note_items_id_seq OWNED BY public.delivery_note_items.id;


--
-- Name: delivery_note_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_note_jobs (
    id integer NOT NULL,
    delivery_note_id character varying(50),
    job_no character varying(50),
    packages_count integer,
    packages_type character varying(50)
);


ALTER TABLE public.delivery_note_jobs OWNER TO postgres;

--
-- Name: delivery_note_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_note_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_note_jobs_id_seq OWNER TO postgres;

--
-- Name: delivery_note_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_note_jobs_id_seq OWNED BY public.delivery_note_jobs.id;


--
-- Name: delivery_note_vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_note_vehicles (
    id integer NOT NULL,
    delivery_note_id character varying(50),
    vehicle_id character varying(50),
    driver_name character varying(255),
    driver_contact character varying(100),
    discharge_location character varying(255)
);


ALTER TABLE public.delivery_note_vehicles OWNER TO postgres;

--
-- Name: delivery_note_vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_note_vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_note_vehicles_id_seq OWNER TO postgres;

--
-- Name: delivery_note_vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_note_vehicles_id_seq OWNED BY public.delivery_note_vehicles.id;


--
-- Name: delivery_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_notes (
    id character varying(50) NOT NULL,
    shipment_id character varying(50),
    consignee character varying(255),
    exporter character varying(255),
    details_location character varying(255),
    details_type character varying(50) DEFAULT 'BL / AWB'::character varying,
    issued_date date DEFAULT CURRENT_DATE,
    issued_by character varying(255),
    status character varying(50) DEFAULT 'Pending'::character varying,
    unloading_date date,
    signed_document_path text,
    comments text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    loading_date date,
    documents jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.delivery_notes OWNER TO postgres;

--
-- Name: exporters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exporters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    address text,
    code character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    country character varying(100)
);


ALTER TABLE public.exporters OWNER TO postgres;

--
-- Name: file_storage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_storage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    filename text,
    mime_type text,
    data bytea,
    size integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.file_storage OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id character varying(50) NOT NULL,
    shipment_id character varying(50),
    amount numeric(12,2) NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying,
    issued_date date DEFAULT CURRENT_DATE,
    due_date date,
    file_path text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: job_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_payments (
    id integer NOT NULL,
    job_id character varying(50),
    payment_type character varying(100) NOT NULL,
    vendor character varying(255),
    amount numeric(15,2) NOT NULL,
    bill_ref_no character varying(100),
    paid_by character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    requested_by uuid,
    status character varying(50) DEFAULT 'Pending'::character varying,
    voucher_no character varying(50),
    payment_mode character varying(50),
    comments text,
    processed_by uuid,
    paid_at timestamp without time zone
);


ALTER TABLE public.job_payments OWNER TO postgres;

--
-- Name: job_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_payments_id_seq OWNER TO postgres;

--
-- Name: job_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_payments_id_seq OWNED BY public.job_payments.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id uuid,
    title character varying(255) NOT NULL,
    message text,
    type character varying(50) DEFAULT 'info'::character varying,
    is_read boolean DEFAULT false,
    link character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payment_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_items (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    vendor_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_items OWNER TO postgres;

--
-- Name: payment_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_items_id_seq OWNER TO postgres;

--
-- Name: payment_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_items_id_seq OWNED BY public.payment_items.id;


--
-- Name: shipment_bls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipment_bls (
    id bigint NOT NULL,
    shipment_id text,
    master_bl text,
    house_bl text,
    loading_port text,
    vessel text,
    etd timestamp without time zone,
    eta timestamp without time zone,
    delivery_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    packages json
);


ALTER TABLE public.shipment_bls OWNER TO postgres;

--
-- Name: shipment_bls_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shipment_bls_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipment_bls_id_seq OWNER TO postgres;

--
-- Name: shipment_bls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shipment_bls_id_seq OWNED BY public.shipment_bls.id;


--
-- Name: shipment_containers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipment_containers (
    id integer NOT NULL,
    shipment_id text,
    container_no text,
    container_type text,
    unloaded_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    packages jsonb
);


ALTER TABLE public.shipment_containers OWNER TO postgres;

--
-- Name: shipment_containers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shipment_containers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipment_containers_id_seq OWNER TO postgres;

--
-- Name: shipment_containers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shipment_containers_id_seq OWNED BY public.shipment_containers.id;


--
-- Name: shipment_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipment_documents (
    id integer NOT NULL,
    shipment_id character varying(50),
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    document_type character varying(50),
    uploaded_by uuid,
    uploaded_by_name character varying(255)
);


ALTER TABLE public.shipment_documents OWNER TO postgres;

--
-- Name: shipment_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shipment_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipment_documents_id_seq OWNER TO postgres;

--
-- Name: shipment_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shipment_documents_id_seq OWNED BY public.shipment_documents.id;


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipments (
    id character varying(50) NOT NULL,
    customer character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'Processing'::character varying NOT NULL,
    progress integer DEFAULT 0,
    weight character varying(50),
    date date NOT NULL,
    driver character varying(255),
    vehicle_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sender_name character varying(255),
    sender_address text,
    receiver_name character varying(255),
    receiver_address text,
    dimensions character varying(100),
    price numeric(12,2),
    expected_delivery_date date,
    transport_mode character varying(50),
    invoice_no character varying(100),
    invoice_items text,
    customs_r_form character varying(100),
    bl_awb_no character varying(100),
    container_no text,
    container_type text,
    cbm numeric(10,3),
    expense_macl numeric(15,2) DEFAULT 0,
    expense_mpl numeric(15,2) DEFAULT 0,
    expense_mcs numeric(15,2) DEFAULT 0,
    expense_transportation numeric(15,2) DEFAULT 0,
    expense_liner numeric(15,2) DEFAULT 0,
    house_bl character varying(100),
    delivery_agent character varying(255),
    unloaded_date timestamp without time zone,
    shipment_type character varying(50),
    billing_contact character varying(100),
    service character varying(100),
    packages character varying,
    origin character varying,
    CONSTRAINT shipments_progress_check CHECK (((progress >= 0) AND (progress <= 100)))
);


ALTER TABLE public.shipments OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    ip_address text,
    user_agent text,
    last_active timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email character varying(255),
    reset_password_token character varying(255),
    reset_password_expires timestamp without time zone,
    must_change_password boolean DEFAULT false,
    photo_url text,
    two_factor_secret text,
    two_factor_enabled boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    id character varying(50) NOT NULL,
    name character varying(255),
    type character varying(100),
    owner character varying(255),
    phone character varying(50),
    email character varying(255),
    comments text,
    driver character varying(255),
    status character varying(50) DEFAULT 'Idle'::character varying,
    location character varying(255),
    fuel integer DEFAULT 100,
    maintenance character varying(50) DEFAULT 'Good'::character varying,
    mileage character varying(50),
    next_service character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    city character varying(100),
    region character varying(100),
    billing_country character varying(100),
    postal_code character varying(20),
    bank_name character varying(255),
    account_number character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    company_name character varying(255),
    currency character varying(20),
    billing_street text,
    billing_address text
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- Name: _migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._migrations ALTER COLUMN id SET DEFAULT nextval('public._migrations_id_seq'::regclass);


--
-- Name: analytics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics ALTER COLUMN id SET DEFAULT nextval('public.analytics_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: clearance_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clearance_schedules ALTER COLUMN id SET DEFAULT nextval('public.clearance_schedules_id_seq'::regclass);


--
-- Name: delivery_note_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_items ALTER COLUMN id SET DEFAULT nextval('public.delivery_note_items_id_seq'::regclass);


--
-- Name: delivery_note_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_jobs ALTER COLUMN id SET DEFAULT nextval('public.delivery_note_jobs_id_seq'::regclass);


--
-- Name: delivery_note_vehicles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_vehicles ALTER COLUMN id SET DEFAULT nextval('public.delivery_note_vehicles_id_seq'::regclass);


--
-- Name: job_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_payments ALTER COLUMN id SET DEFAULT nextval('public.job_payments_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payment_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_items ALTER COLUMN id SET DEFAULT nextval('public.payment_items_id_seq'::regclass);


--
-- Name: shipment_bls id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_bls ALTER COLUMN id SET DEFAULT nextval('public.shipment_bls_id_seq'::regclass);


--
-- Name: shipment_containers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_containers ALTER COLUMN id SET DEFAULT nextval('public.shipment_containers_id_seq'::regclass);


--
-- Name: shipment_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_documents ALTER COLUMN id SET DEFAULT nextval('public.shipment_documents_id_seq'::regclass);


--
-- Name: _migrations _migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_filename_key UNIQUE (filename);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);


--
-- Name: analytics analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: clearance_schedules clearance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clearance_schedules
    ADD CONSTRAINT clearance_schedules_pkey PRIMARY KEY (id);


--
-- Name: consignees consignees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consignees
    ADD CONSTRAINT consignees_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: delivery_agents delivery_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_agents
    ADD CONSTRAINT delivery_agents_pkey PRIMARY KEY (id);


--
-- Name: delivery_note_items delivery_note_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_items
    ADD CONSTRAINT delivery_note_items_pkey PRIMARY KEY (id);


--
-- Name: delivery_note_jobs delivery_note_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_jobs
    ADD CONSTRAINT delivery_note_jobs_pkey PRIMARY KEY (id);


--
-- Name: delivery_note_vehicles delivery_note_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_vehicles
    ADD CONSTRAINT delivery_note_vehicles_pkey PRIMARY KEY (id);


--
-- Name: delivery_notes delivery_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_notes
    ADD CONSTRAINT delivery_notes_pkey PRIMARY KEY (id);


--
-- Name: exporters exporters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exporters
    ADD CONSTRAINT exporters_pkey PRIMARY KEY (id);


--
-- Name: file_storage file_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_storage
    ADD CONSTRAINT file_storage_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: job_payments job_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_payments
    ADD CONSTRAINT job_payments_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_items payment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_items
    ADD CONSTRAINT payment_items_pkey PRIMARY KEY (id);


--
-- Name: shipment_bls shipment_bls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_bls
    ADD CONSTRAINT shipment_bls_pkey PRIMARY KEY (id);


--
-- Name: shipment_containers shipment_containers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_containers
    ADD CONSTRAINT shipment_containers_pkey PRIMARY KEY (id);


--
-- Name: shipment_documents shipment_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_documents
    ADD CONSTRAINT shipment_documents_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: idx_analytics_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analytics_date ON public.analytics USING btree (date);


--
-- Name: idx_analytics_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analytics_type ON public.analytics USING btree (metric_type);


--
-- Name: idx_audit_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_clearance_schedules_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clearance_schedules_job_id ON public.clearance_schedules USING btree (job_id);


--
-- Name: idx_consignees_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consignees_name ON public.consignees USING btree (name);


--
-- Name: idx_customers_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_name ON public.customers USING btree (name);


--
-- Name: idx_delivery_notes_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_notes_date ON public.delivery_notes USING btree (issued_date);


--
-- Name: idx_delivery_notes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_notes_status ON public.delivery_notes USING btree (status);


--
-- Name: idx_documents_shipment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_shipment_id ON public.shipment_documents USING btree (shipment_id);


--
-- Name: idx_exporters_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exporters_name ON public.exporters USING btree (name);


--
-- Name: idx_invoices_shipment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_shipment_id ON public.invoices USING btree (shipment_id);


--
-- Name: idx_payments_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_job_id ON public.job_payments USING btree (job_id);


--
-- Name: idx_shipments_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipments_date ON public.shipments USING btree (date);


--
-- Name: idx_shipments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipments_status ON public.shipments USING btree (status);


--
-- Name: idx_user_sessions_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_token_hash ON public.user_sessions USING btree (token_hash);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: clearance_schedules clearance_schedules_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clearance_schedules
    ADD CONSTRAINT clearance_schedules_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: delivery_note_items delivery_note_items_delivery_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_items
    ADD CONSTRAINT delivery_note_items_delivery_note_id_fkey FOREIGN KEY (delivery_note_id) REFERENCES public.delivery_notes(id) ON DELETE CASCADE;


--
-- Name: delivery_note_items delivery_note_items_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_items
    ADD CONSTRAINT delivery_note_items_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.shipments(id);


--
-- Name: delivery_note_items delivery_note_items_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_items
    ADD CONSTRAINT delivery_note_items_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.clearance_schedules(id);


--
-- Name: delivery_note_jobs delivery_note_jobs_delivery_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_jobs
    ADD CONSTRAINT delivery_note_jobs_delivery_note_id_fkey FOREIGN KEY (delivery_note_id) REFERENCES public.delivery_notes(id) ON DELETE CASCADE;


--
-- Name: delivery_note_vehicles delivery_note_vehicles_delivery_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_note_vehicles
    ADD CONSTRAINT delivery_note_vehicles_delivery_note_id_fkey FOREIGN KEY (delivery_note_id) REFERENCES public.delivery_notes(id) ON DELETE CASCADE;


--
-- Name: shipments fk_vehicle; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT fk_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: job_payments job_payments_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_payments
    ADD CONSTRAINT job_payments_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: job_payments job_payments_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_payments
    ADD CONSTRAINT job_payments_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payment_items payment_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_items
    ADD CONSTRAINT payment_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: shipment_bls shipment_bls_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_bls
    ADD CONSTRAINT shipment_bls_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: shipment_containers shipment_containers_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_containers
    ADD CONSTRAINT shipment_containers_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: shipment_documents shipment_documents_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_documents
    ADD CONSTRAINT shipment_documents_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: shipment_documents shipment_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_documents
    ADD CONSTRAINT shipment_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE _migrations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public._migrations TO anon;
GRANT ALL ON TABLE public._migrations TO authenticated;
GRANT ALL ON TABLE public._migrations TO service_role;


--
-- Name: SEQUENCE _migrations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public._migrations_id_seq TO anon;
GRANT ALL ON SEQUENCE public._migrations_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public._migrations_id_seq TO service_role;


--
-- Name: TABLE analytics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.analytics TO anon;
GRANT ALL ON TABLE public.analytics TO authenticated;
GRANT ALL ON TABLE public.analytics TO service_role;


--
-- Name: SEQUENCE analytics_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.analytics_id_seq TO anon;
GRANT ALL ON SEQUENCE public.analytics_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.analytics_id_seq TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: SEQUENCE audit_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO service_role;


--
-- Name: TABLE clearance_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clearance_schedules TO anon;
GRANT ALL ON TABLE public.clearance_schedules TO authenticated;
GRANT ALL ON TABLE public.clearance_schedules TO service_role;


--
-- Name: SEQUENCE clearance_schedules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.clearance_schedules_id_seq TO anon;
GRANT ALL ON SEQUENCE public.clearance_schedules_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.clearance_schedules_id_seq TO service_role;


--
-- Name: TABLE consignees; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consignees TO anon;
GRANT ALL ON TABLE public.consignees TO authenticated;
GRANT ALL ON TABLE public.consignees TO service_role;


--
-- Name: TABLE customers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customers TO anon;
GRANT ALL ON TABLE public.customers TO authenticated;
GRANT ALL ON TABLE public.customers TO service_role;


--
-- Name: TABLE delivery_agents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.delivery_agents TO anon;
GRANT ALL ON TABLE public.delivery_agents TO authenticated;
GRANT ALL ON TABLE public.delivery_agents TO service_role;


--
-- Name: TABLE delivery_note_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.delivery_note_items TO anon;
GRANT ALL ON TABLE public.delivery_note_items TO authenticated;
GRANT ALL ON TABLE public.delivery_note_items TO service_role;


--
-- Name: SEQUENCE delivery_note_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.delivery_note_items_id_seq TO anon;
GRANT ALL ON SEQUENCE public.delivery_note_items_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.delivery_note_items_id_seq TO service_role;


--
-- Name: TABLE delivery_note_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.delivery_note_jobs TO anon;
GRANT ALL ON TABLE public.delivery_note_jobs TO authenticated;
GRANT ALL ON TABLE public.delivery_note_jobs TO service_role;


--
-- Name: SEQUENCE delivery_note_jobs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.delivery_note_jobs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.delivery_note_jobs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.delivery_note_jobs_id_seq TO service_role;


--
-- Name: TABLE delivery_note_vehicles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.delivery_note_vehicles TO anon;
GRANT ALL ON TABLE public.delivery_note_vehicles TO authenticated;
GRANT ALL ON TABLE public.delivery_note_vehicles TO service_role;


--
-- Name: SEQUENCE delivery_note_vehicles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.delivery_note_vehicles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.delivery_note_vehicles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.delivery_note_vehicles_id_seq TO service_role;


--
-- Name: TABLE delivery_notes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.delivery_notes TO anon;
GRANT ALL ON TABLE public.delivery_notes TO authenticated;
GRANT ALL ON TABLE public.delivery_notes TO service_role;


--
-- Name: TABLE exporters; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.exporters TO anon;
GRANT ALL ON TABLE public.exporters TO authenticated;
GRANT ALL ON TABLE public.exporters TO service_role;


--
-- Name: TABLE file_storage; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.file_storage TO anon;
GRANT ALL ON TABLE public.file_storage TO authenticated;
GRANT ALL ON TABLE public.file_storage TO service_role;


--
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invoices TO anon;
GRANT ALL ON TABLE public.invoices TO authenticated;
GRANT ALL ON TABLE public.invoices TO service_role;


--
-- Name: TABLE job_payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.job_payments TO anon;
GRANT ALL ON TABLE public.job_payments TO authenticated;
GRANT ALL ON TABLE public.job_payments TO service_role;


--
-- Name: SEQUENCE job_payments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.job_payments_id_seq TO anon;
GRANT ALL ON SEQUENCE public.job_payments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.job_payments_id_seq TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notifications_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO service_role;


--
-- Name: TABLE payment_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_items TO anon;
GRANT ALL ON TABLE public.payment_items TO authenticated;
GRANT ALL ON TABLE public.payment_items TO service_role;


--
-- Name: SEQUENCE payment_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.payment_items_id_seq TO anon;
GRANT ALL ON SEQUENCE public.payment_items_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.payment_items_id_seq TO service_role;


--
-- Name: TABLE shipment_bls; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipment_bls TO anon;
GRANT ALL ON TABLE public.shipment_bls TO authenticated;
GRANT ALL ON TABLE public.shipment_bls TO service_role;


--
-- Name: SEQUENCE shipment_bls_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.shipment_bls_id_seq TO anon;
GRANT ALL ON SEQUENCE public.shipment_bls_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.shipment_bls_id_seq TO service_role;


--
-- Name: TABLE shipment_containers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipment_containers TO anon;
GRANT ALL ON TABLE public.shipment_containers TO authenticated;
GRANT ALL ON TABLE public.shipment_containers TO service_role;


--
-- Name: SEQUENCE shipment_containers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.shipment_containers_id_seq TO anon;
GRANT ALL ON SEQUENCE public.shipment_containers_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.shipment_containers_id_seq TO service_role;


--
-- Name: TABLE shipment_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipment_documents TO anon;
GRANT ALL ON TABLE public.shipment_documents TO authenticated;
GRANT ALL ON TABLE public.shipment_documents TO service_role;


--
-- Name: SEQUENCE shipment_documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.shipment_documents_id_seq TO anon;
GRANT ALL ON SEQUENCE public.shipment_documents_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.shipment_documents_id_seq TO service_role;


--
-- Name: TABLE shipments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipments TO anon;
GRANT ALL ON TABLE public.shipments TO authenticated;
GRANT ALL ON TABLE public.shipments TO service_role;


--
-- Name: TABLE user_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_sessions TO anon;
GRANT ALL ON TABLE public.user_sessions TO authenticated;
GRANT ALL ON TABLE public.user_sessions TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: TABLE vehicles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vehicles TO anon;
GRANT ALL ON TABLE public.vehicles TO authenticated;
GRANT ALL ON TABLE public.vehicles TO service_role;


--
-- Name: TABLE vendors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vendors TO anon;
GRANT ALL ON TABLE public.vendors TO authenticated;
GRANT ALL ON TABLE public.vendors TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict o4pQG10laf3v5SxXcqdrJjSAhEvrhp0DEbEdgpIwuE5iY4NwhUKnQyAmVzp62D6

