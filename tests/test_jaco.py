"""
Jaco Sales Assistant — QA test suite for the Sisyphus deployment pipeline.

Covers: regression, unit (static analysis), security, accessibility,
performance, and scalability checks for the Jaco vintage clothing sales app.

Run with:
    pytest tests/test_jaco.py -v
"""

import json
import re
from pathlib import Path

import pytest

# -- Paths -----------------------------------------------------------------

JACO_ROOT = Path(__file__).resolve().parent.parent
SRC = JACO_ROOT / "src"
API = SRC / "app" / "api"
LIB = SRC / "lib"
TYPES = SRC / "types"
MIGRATION_SQL = JACO_ROOT / "data" / "migrations" / "001_initial.sql"
PACKAGE_JSON = JACO_ROOT / "package.json"


@pytest.fixture(scope="module")
def migration_sql():
    return MIGRATION_SQL.read_text()


@pytest.fixture(scope="module")
def package_json():
    return json.loads(PACKAGE_JSON.read_text())


@pytest.fixture(scope="module")
def gitignore_content():
    return (JACO_ROOT / ".gitignore").read_text()


def read_route(route_path: str) -> str:
    """Read an API route file relative to src/app/api/."""
    return (API / route_path / "route.ts").read_text()


def read_lib(name: str) -> str:
    """Read a lib file by name."""
    return (LIB / name).read_text()


def read_page(page_path: str) -> str:
    """Read a page file relative to src/app/."""
    return (SRC / "app" / page_path).read_text()


# == 1. REGRESSION: Project Structure ======================================


class TestJacoStructure:
    """Verify all required files and directories exist."""

    @pytest.mark.parametrize("path", [
        "package.json",
        "next.config.ts",
        "tsconfig.json",
        ".gitignore",
        ".env.local",
        "src/lib/db.ts",
        "src/lib/recognize.ts",
        "src/lib/describe.ts",
        "src/lib/margin.ts",
        "src/lib/marketplace-fees.ts",
        "src/lib/upload.ts",
        "src/lib/claude.ts",
        "src/types/item.ts",
        "src/types/lot.ts",
        "src/types/dashboard.ts",
        "data/migrations/001_initial.sql",
    ])
    def test_required_file_exists(self, path):
        assert (JACO_ROOT / path).is_file(), f"Missing: {path}"

    @pytest.mark.parametrize("directory", [
        "src/app/api",
        "src/app/api/items",
        "src/app/api/items/[id]",
        "src/app/api/items/[id]/description",
        "src/app/api/lots",
        "src/app/api/lots/[id]",
        "src/app/api/recognize",
        "src/app/api/upload",
        "src/app/api/dashboard",
        "src/lib",
        "src/types",
        "data/migrations",
        "public/uploads",
    ])
    def test_required_directory_exists(self, directory):
        assert (JACO_ROOT / directory).is_dir(), f"Missing dir: {directory}"

    def test_migration_sql_is_valid(self, migration_sql):
        assert len(migration_sql) > 100, "Migration SQL too short"
        assert "CREATE TABLE" in migration_sql


# == 2. REGRESSION: API Route Contracts ====================================


class TestAPIContracts:
    """Verify API routes maintain expected handler contracts."""

    def test_items_route_has_get(self):
        code = read_route("items")
        assert "export async function GET" in code

    def test_items_route_has_post(self):
        code = read_route("items")
        assert "export async function POST" in code

    def test_items_id_has_get(self):
        code = read_route("items/[id]")
        assert "export async function GET" in code

    def test_items_id_has_put(self):
        code = read_route("items/[id]")
        assert "export async function PUT" in code

    def test_items_id_has_delete(self):
        code = read_route("items/[id]")
        assert "export async function DELETE" in code

    def test_description_has_post(self):
        code = read_route("items/[id]/description")
        assert "export async function POST" in code

    def test_lots_route_has_get(self):
        code = read_route("lots")
        assert "export async function GET" in code

    def test_lots_route_has_post(self):
        code = read_route("lots")
        assert "export async function POST" in code

    def test_lots_id_has_get(self):
        code = read_route("lots/[id]")
        assert "export async function GET" in code

    def test_lots_id_has_put(self):
        code = read_route("lots/[id]")
        assert "export async function PUT" in code

    def test_lots_id_has_delete(self):
        code = read_route("lots/[id]")
        assert "export async function DELETE" in code

    def test_dashboard_has_get(self):
        code = read_route("dashboard")
        assert "export async function GET" in code

    def test_upload_has_post(self):
        code = read_route("upload")
        assert "export async function POST" in code

    def test_recognize_has_post(self):
        code = read_route("recognize")
        assert "export async function POST" in code

    def test_items_route_imports_from_lib(self):
        code = read_route("items")
        assert '@/lib/db' in code, "Items route must import db from lib"

    def test_items_id_imports_from_lib(self):
        code = read_route("items/[id]")
        assert '@/lib/db' in code
        assert '@/lib/upload' in code

    def test_description_imports_from_lib(self):
        code = read_route("items/[id]/description")
        assert '@/lib/describe' in code
        assert '@/lib/db' in code

    def test_recognize_imports_from_lib(self):
        code = read_route("recognize")
        assert '@/lib/recognize' in code

    def test_upload_imports_from_lib(self):
        code = read_route("upload")
        assert '@/lib/upload' in code

    def test_dashboard_imports_from_lib(self):
        code = read_route("dashboard")
        assert '@/lib/db' in code
        assert '@/lib/marketplace-fees' in code

    def test_items_post_returns_201(self):
        code = read_route("items")
        assert "status: 201" in code

    def test_lots_post_returns_201(self):
        code = read_route("lots")
        assert "status: 201" in code

    def test_items_id_returns_404_when_not_found(self):
        code = read_route("items/[id]")
        assert "status: 404" in code

    def test_lots_id_returns_404_when_not_found(self):
        code = read_route("lots/[id]")
        assert "status: 404" in code


# == 3. REGRESSION: Database Schema ========================================


class TestDatabaseSchema:
    """Verify database schema integrity from migration SQL."""

    def test_creates_items_table(self, migration_sql):
        assert "CREATE TABLE IF NOT EXISTS items" in migration_sql

    def test_creates_lots_table(self, migration_sql):
        assert "CREATE TABLE IF NOT EXISTS lots" in migration_sql

    def test_creates_tags_table(self, migration_sql):
        assert "CREATE TABLE IF NOT EXISTS tags" in migration_sql

    @pytest.mark.parametrize("column", [
        "id", "lot_id", "item_type", "brand", "era", "material", "color",
        "size", "condition", "cogs", "sale_price", "sold_price",
        "marketplace", "status", "description_it", "description_en",
        "image_paths", "recognition_raw", "created_at", "updated_at",
        "sold_at",
    ])
    def test_items_has_required_column(self, migration_sql, column):
        # Extract only the items table definition
        items_match = re.search(
            r'CREATE TABLE IF NOT EXISTS items\s*\((.*?)\);',
            migration_sql,
            re.DOTALL,
        )
        assert items_match, "items table not found in migration"
        items_def = items_match.group(1)
        assert column in items_def, f"items table missing column: {column}"

    @pytest.mark.parametrize("column", [
        "id", "name", "total_cogs", "notes", "created_at", "updated_at",
    ])
    def test_lots_has_required_column(self, migration_sql, column):
        lots_match = re.search(
            r'CREATE TABLE IF NOT EXISTS lots\s*\((.*?)\);',
            migration_sql,
            re.DOTALL,
        )
        assert lots_match, "lots table not found in migration"
        lots_def = lots_match.group(1)
        assert column in lots_def, f"lots table missing column: {column}"

    @pytest.mark.parametrize("column", [
        "id", "item_id", "category", "value",
    ])
    def test_tags_has_required_column(self, migration_sql, column):
        tags_match = re.search(
            r'CREATE TABLE IF NOT EXISTS tags\s*\((.*?)\);',
            migration_sql,
            re.DOTALL,
        )
        assert tags_match, "tags table not found in migration"
        tags_def = tags_match.group(1)
        assert column in tags_def, f"tags table missing column: {column}"

    def test_items_lot_id_foreign_key(self, migration_sql):
        assert "REFERENCES lots(id)" in migration_sql

    def test_tags_item_id_foreign_key(self, migration_sql):
        assert "REFERENCES items(id)" in migration_sql

    def test_tags_cascade_delete(self, migration_sql):
        assert "ON DELETE CASCADE" in migration_sql

    def test_items_lot_id_set_null(self, migration_sql):
        assert "ON DELETE SET NULL" in migration_sql

    @pytest.mark.parametrize("index_name", [
        "idx_tags_value",
        "idx_tags_category_value",
        "idx_items_status",
        "idx_items_lot_id",
        "idx_items_marketplace",
        "idx_items_sold_at",
    ])
    def test_index_exists(self, migration_sql, index_name):
        assert index_name in migration_sql, f"Missing index: {index_name}"

    def test_tags_unique_constraint(self, migration_sql):
        assert "UNIQUE(item_id, category, value)" in migration_sql


# == 4. SECURITY: Secrets ==================================================


class TestSecuritySecrets:
    """Scan source code for hardcoded secrets and validate secret handling."""

    def test_no_hardcoded_api_keys_in_source(self):
        patterns = [
            r'sk-ant-[A-Za-z0-9]{20,}',
            r'sk_live_[A-Za-z0-9]{20,}',
            r'pk_live_[A-Za-z0-9]{20,}',
        ]
        for ts_file in SRC.rglob("*.ts"):
            if "node_modules" in str(ts_file):
                continue
            content = ts_file.read_text()
            for pattern in patterns:
                match = re.search(pattern, content)
                assert match is None, (
                    f"Possible hardcoded secret in {ts_file.relative_to(JACO_ROOT)}: "
                    f"{match.group(0)[:20]}..."
                )
        for tsx_file in SRC.rglob("*.tsx"):
            if "node_modules" in str(tsx_file):
                continue
            content = tsx_file.read_text()
            for pattern in patterns:
                match = re.search(pattern, content)
                assert match is None, (
                    f"Possible hardcoded secret in {tsx_file.relative_to(JACO_ROOT)}"
                )

    def test_gitignore_covers_env_files(self, gitignore_content):
        assert ".env*.local" in gitignore_content

    def test_gitignore_covers_node_modules(self, gitignore_content):
        assert "node_modules" in gitignore_content

    def test_gitignore_covers_database_files(self, gitignore_content):
        assert "*.db" in gitignore_content

    def test_gitignore_covers_uploads(self, gitignore_content):
        assert "uploads" in gitignore_content

    def test_api_key_loaded_from_env(self):
        code = read_lib("claude.ts")
        assert "process.env.ANTHROPIC_API_KEY" in code, (
            "API key must be loaded from environment variable"
        )

    def test_no_secrets_in_client_code(self):
        """Client-side code (pages, components) must not reference API keys."""
        client_dirs = [
            SRC / "app",
            SRC / "components",
        ]
        for d in client_dirs:
            for tsx_file in d.rglob("*.tsx"):
                content = tsx_file.read_text()
                assert "ANTHROPIC_API_KEY" not in content, (
                    f"Client file {tsx_file.relative_to(JACO_ROOT)} references API key"
                )

    def test_claude_client_is_singleton(self):
        code = read_lib("claude.ts")
        assert "let client" in code
        assert "if (client) return client" in code


# == 5. SECURITY: Input Validation =========================================


class TestSecurityInputValidation:
    """Verify input validation patterns across API routes."""

    def test_upload_validates_file_type(self):
        code = read_route("upload")
        assert 'file.type.startsWith("image/")' in code, (
            "Upload must validate image MIME type"
        )

    def test_upload_validates_file_size(self):
        code = read_route("upload")
        assert "5 * 1024 * 1024" in code, "Upload must enforce 5MB limit"

    def test_upload_returns_400_for_no_files(self):
        code = read_route("upload")
        assert "status: 400" in code

    def test_recognize_returns_400_for_missing_image_path(self):
        code = read_route("recognize")
        assert "status: 400" in code
        assert "imagePath" in code

    def test_no_sql_injection_in_items_route(self):
        """All queries must use parameterized statements with ?."""
        code = read_route("items")
        # Ensure parameterized queries (? placeholders)
        assert ".prepare(" in code
        # No string interpolation in SQL
        sql_stmts = re.findall(r'\.prepare\([`"\'](.+?)[`"\']\)', code, re.DOTALL)
        for stmt in sql_stmts:
            assert "${" not in stmt, f"SQL injection risk: template literal in query: {stmt[:60]}"

    def test_no_sql_injection_in_items_id_route(self):
        code = read_route("items/[id]")
        assert ".prepare(" in code
        # The UPDATE uses fields.join() from a hardcoded allowlist, which is safe.
        # Verify that the allowlist pattern exists (updatable array of field names).
        assert "const updatable" in code or "updatable" in code, (
            "PUT handler must use an allowlist of updatable fields"
        )
        # Verify user input is never directly interpolated in WHERE clauses
        where_stmts = re.findall(r'WHERE\s+(.+?)[\)"`]', code)
        for stmt in where_stmts:
            assert "body" not in stmt, f"User input in WHERE clause: {stmt[:60]}"

    def test_no_eval_or_exec_in_source(self):
        """No eval() or exec() usage anywhere in source."""
        for ext in ("*.ts", "*.tsx"):
            for f in SRC.rglob(ext):
                if "node_modules" in str(f):
                    continue
                content = f.read_text()
                assert not re.search(r'\beval\s*\(', content), (
                    f"eval() found in {f.relative_to(JACO_ROOT)}"
                )

    def test_items_id_get_returns_404(self):
        code = read_route("items/[id]")
        assert "status: 404" in code

    def test_description_returns_404_when_item_missing(self):
        code = read_route("items/[id]/description")
        assert "status: 404" in code


# == 6. SECURITY: File Handling ============================================


class TestSecurityFileHandling:
    """Verify upload/delete file handling security."""

    def test_uploads_use_uuid_filenames(self):
        code = read_lib("upload.ts")
        assert "uuidv4" in code, "Uploads must use UUID filenames"
        assert "uuidv4()" in code

    def test_upload_does_not_use_user_filename(self):
        code = read_lib("upload.ts")
        # The filename is constructed from uuid + extension only
        assert '`${uuidv4()}${ext}`' in code

    def test_delete_validates_path_existence(self):
        code = read_lib("upload.ts")
        assert "fs.existsSync(fullPath)" in code, (
            "Delete must check file existence before unlinking"
        )

    def test_delete_uses_path_resolve(self):
        code = read_lib("upload.ts")
        assert 'path.resolve("public"' in code, (
            "Delete must use path.resolve to construct safe paths"
        )

    def test_upload_dir_is_in_public(self):
        code = read_lib("upload.ts")
        assert 'path.resolve("public/uploads")' in code


# == 7. ACCESSIBILITY ======================================================


class TestAccessibility:
    """Verify accessibility patterns in the codebase."""

    def test_layout_has_lang_attribute(self):
        code = read_page("layout.tsx")
        assert 'lang="it"' in code, "HTML must have lang attribute"

    def test_layout_has_main_element(self):
        code = read_page("layout.tsx")
        assert "<main" in code, "Layout must use semantic <main>"

    def test_sidebar_has_nav_element(self):
        code = (SRC / "components" / "layout" / "sidebar.tsx").read_text()
        assert "<nav" in code, "Sidebar must use semantic <nav>"

    def test_sidebar_has_aside_element(self):
        code = (SRC / "components" / "layout" / "sidebar.tsx").read_text()
        assert "<aside" in code, "Sidebar must use semantic <aside>"

    def test_dashboard_has_h1(self):
        code = read_page("page.tsx")
        assert "<h1" in code, "Dashboard page needs an <h1>"

    def test_items_page_has_h1(self):
        code = read_page("items/page.tsx")
        assert "<h1" in code, "Items page needs an <h1>"

    def test_lots_page_has_h1(self):
        code = read_page("lots/page.tsx")
        assert "<h1" in code, "Lots page needs an <h1>"

    def test_new_item_page_has_h1(self):
        code = read_page("items/new/page.tsx")
        assert "<h1" in code, "New item page needs an <h1>"

    def test_dashboard_has_h2_sections(self):
        code = read_page("page.tsx")
        assert "<h2" in code, "Dashboard should have section headings"

    def test_form_inputs_have_labels_in_new_item(self):
        code = read_page("items/new/page.tsx")
        assert "<label" in code, "Form inputs must have labels"

    def test_form_inputs_have_labels_in_lots(self):
        code = read_page("lots/page.tsx")
        assert "<label" in code, "Form inputs must have labels"

    def test_form_inputs_have_labels_in_item_detail(self):
        code = read_page("items/[id]/page.tsx")
        assert "<label" in code, "Form inputs must have labels"

    def test_images_have_alt_in_items_page(self):
        code = read_page("items/page.tsx")
        img_tags = re.findall(r'<img[^>]*>', code)
        for tag in img_tags:
            assert 'alt=' in tag, f"Image missing alt attribute: {tag[:80]}"

    def test_images_have_alt_in_new_item(self):
        code = read_page("items/new/page.tsx")
        img_tags = re.findall(r'<img[^>]*>', code)
        for tag in img_tags:
            assert 'alt=' in tag, f"Image missing alt: {tag[:80]}"

    def test_images_have_alt_in_item_detail(self):
        code = read_page("items/[id]/page.tsx")
        img_tags = re.findall(r'<img[^>]*>', code)
        for tag in img_tags:
            assert 'alt=' in tag, f"Image missing alt: {tag[:80]}"

    def test_buttons_are_button_elements(self):
        """Verify buttons use actual <button> not <div onClick>."""
        code = read_page("items/new/page.tsx")
        assert "<button" in code

    def test_status_badges_have_distinct_colors(self):
        code = read_page("items/page.tsx")
        # Each status has a distinct foreground + background combo
        assert "bg-stone-200 text-stone-700" in code  # draft
        assert "bg-amber-100 text-amber-800" in code  # listed
        assert "bg-green-100 text-green-800" in code   # sold


# == 8. PERFORMANCE ========================================================


class TestPerformance:
    """Verify performance-related patterns in the codebase."""

    def test_recognition_max_tokens_bounded(self):
        code = read_lib("recognize.ts")
        match = re.search(r'max_tokens:\s*(\d+)', code)
        assert match, "Recognition must set max_tokens"
        tokens = int(match.group(1))
        assert tokens == 1024, f"Recognition max_tokens should be 1024, got {tokens}"

    def test_description_max_tokens_bounded(self):
        code = read_lib("describe.ts")
        match = re.search(r'max_tokens:\s*(\d+)', code)
        assert match, "Description must set max_tokens"
        tokens = int(match.group(1))
        assert tokens == 512, f"Description max_tokens should be 512, got {tokens}"

    def test_sqlite_uses_wal_mode(self):
        code = read_lib("db.ts")
        assert "journal_mode = WAL" in code, "SQLite must use WAL mode"

    def test_sqlite_enables_foreign_keys(self):
        code = read_lib("db.ts")
        assert "foreign_keys = ON" in code

    def test_database_has_indexes_on_key_columns(self, migration_sql):
        required = [
            "idx_items_status",
            "idx_items_lot_id",
            "idx_items_marketplace",
            "idx_items_sold_at",
            "idx_tags_value",
            "idx_tags_category_value",
        ]
        for idx in required:
            assert idx in migration_sql, f"Missing index: {idx}"

    def test_upload_file_size_limit(self):
        code = read_route("upload")
        assert "5 * 1024 * 1024" in code, "Uploads must be limited to 5MB"

    def test_api_routes_return_json(self):
        """API routes must return NextResponse.json(), not HTML."""
        routes = [
            "items", "items/[id]", "lots", "lots/[id]",
            "dashboard", "upload", "recognize",
            "items/[id]/description",
        ]
        for route in routes:
            code = read_route(route)
            assert "NextResponse.json" in code, (
                f"/api/{route} must return JSON responses"
            )

    def test_dashboard_uses_sql_aggregations(self):
        code = read_route("dashboard")
        assert "COUNT(" in code, "Dashboard should use SQL COUNT aggregation"
        assert "GROUP BY" in code, "Dashboard should use GROUP BY"

    def test_recognition_specifies_model(self):
        code = read_lib("recognize.ts")
        assert "claude-sonnet-4" in code, "Recognition must specify a model"


# == 9. SCALABILITY ========================================================


class TestScalability:
    """Verify patterns that support scalability."""

    def test_sqlite_connection_is_singleton(self):
        code = read_lib("db.ts")
        assert "let db:" in code, "DB must use singleton pattern"
        assert "if (db) return db" in code, (
            "getDb must return existing connection"
        )

    def test_migrations_are_idempotent(self, migration_sql):
        create_stmts = re.findall(r'CREATE TABLE IF NOT EXISTS', migration_sql)
        assert len(create_stmts) >= 3, (
            f"Expected >=3 IF NOT EXISTS tables, found {len(create_stmts)}"
        )
        create_idx = re.findall(r'CREATE INDEX IF NOT EXISTS', migration_sql)
        assert len(create_idx) >= 4, (
            f"Expected >=4 IF NOT EXISTS indexes, found {len(create_idx)}"
        )

    def test_migrations_tracked_in_table(self):
        code = read_lib("db.ts")
        assert "_migrations" in code, (
            "Migrations must be tracked in a _migrations table"
        )

    def test_file_uploads_stored_on_disk(self):
        code = read_lib("upload.ts")
        assert "fs.writeFileSync" in code, "Uploads stored on disk"
        # Not stored as blob in database
        migration = MIGRATION_SQL.read_text()
        assert "BLOB" not in migration, "Images must not be stored as BLOBs in DB"

    def test_api_routes_are_stateless(self):
        """API routes must not use module-level mutable state."""
        routes = [
            "items", "items/[id]", "lots", "lots/[id]",
            "dashboard", "upload", "recognize",
            "items/[id]/description",
        ]
        for route in routes:
            code = read_route(route)
            # No module-level let/var (only const, import, export, type)
            lines = code.split("\n")
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("let ") or stripped.startswith("var "):
                    # module-level mutable state
                    assert False, (
                        f"/api/{route} has module-level mutable state: {stripped}"
                    )
                # Stop checking at first function definition (inside function is OK)
                if "export async function" in stripped:
                    break

    def test_dashboard_uses_sql_aggregation_not_client(self):
        """Dashboard must compute aggregations server-side, not in the browser."""
        code = read_route("dashboard")
        assert "GROUP BY" in code
        assert "COUNT(" in code

    def test_claude_client_is_singleton(self):
        code = read_lib("claude.ts")
        assert "let client:" in code or "let client:" in code
        assert "if (client) return client" in code


# == 10. UNIT: Margin Calculation ==========================================


class TestMarginCalculation:
    """Verify margin calculation logic via static analysis."""

    def test_margin_imports_get_platform_fee(self):
        code = read_lib("margin.ts")
        assert "getPlatformFee" in code

    def test_margin_formula_net_revenue(self):
        code = read_lib("margin.ts")
        assert "salePrice - platformFee" in code

    def test_margin_formula_net_margin(self):
        code = read_lib("margin.ts")
        assert "netRevenue - cogs" in code

    def test_margin_percent_formula(self):
        code = read_lib("margin.ts")
        assert "(netMargin / salePrice) * 100" in code

    def test_margin_handles_zero_sale_price(self):
        code = read_lib("margin.ts")
        assert "salePrice > 0" in code, (
            "Must handle zero sale price to avoid division by zero"
        )

    def test_margin_accepts_null_marketplace(self):
        code = read_lib("margin.ts")
        assert "Marketplace | null" in code

    def test_margin_returns_result_interface(self):
        code = read_lib("margin.ts")
        assert "MarginResult" in code
        assert "platformFee" in code
        assert "netRevenue" in code
        assert "netMargin" in code
        assert "marginPercent" in code


# == 11. UNIT: Recognition Prompt ==========================================


class TestRecognitionPrompt:
    """Verify recognition prompt structure and Claude API configuration."""

    def test_system_prompt_requires_json_output(self):
        code = read_lib("recognize.ts")
        assert "ONLY valid JSON" in code or "Return ONLY the JSON" in code

    def test_prompt_includes_item_type_field(self):
        code = read_lib("recognize.ts")
        assert '"item_type"' in code

    def test_prompt_includes_brand_field(self):
        code = read_lib("recognize.ts")
        assert '"brand"' in code

    def test_prompt_includes_era_field(self):
        code = read_lib("recognize.ts")
        assert '"era"' in code

    def test_prompt_includes_material_field(self):
        code = read_lib("recognize.ts")
        assert '"material"' in code

    def test_prompt_includes_color_field(self):
        code = read_lib("recognize.ts")
        assert '"color"' in code

    def test_prompt_includes_size_field(self):
        code = read_lib("recognize.ts")
        assert '"size"' in code

    def test_prompt_includes_condition_field(self):
        code = read_lib("recognize.ts")
        assert '"condition"' in code

    def test_prompt_includes_tags_field(self):
        code = read_lib("recognize.ts")
        assert '"tags"' in code

    def test_prompt_includes_confidence_field(self):
        code = read_lib("recognize.ts")
        assert '"confidence"' in code

    def test_uses_claude_vision_image_content(self):
        code = read_lib("recognize.ts")
        assert 'type: "image"' in code
        assert 'type: "base64"' in code

    def test_specifies_model(self):
        code = read_lib("recognize.ts")
        assert "claude-sonnet-4" in code, "Must specify Claude model"

    def test_max_tokens_is_1024(self):
        code = read_lib("recognize.ts")
        assert "max_tokens: 1024" in code

    def test_uses_system_prompt(self):
        code = read_lib("recognize.ts")
        assert "system: SYSTEM_PROMPT" in code


# == 12. UNIT: Description Prompt ==========================================


class TestDescriptionPrompt:
    """Verify description generation prompt structure."""

    def test_has_vinted_prompts(self):
        code = read_lib("describe.ts")
        assert "vinted" in code

    def test_has_ebay_prompts(self):
        code = read_lib("describe.ts")
        assert "ebay" in code

    def test_has_italian_locale(self):
        code = read_lib("describe.ts")
        assert '"it"' in code or "'it'" in code

    def test_has_english_locale(self):
        code = read_lib("describe.ts")
        assert '"en"' in code or "'en'" in code

    def test_vinted_style_is_casual_with_hashtags(self):
        code = read_lib("describe.ts")
        # Check the Vinted prompt mentions casual and hashtag
        assert "casual" in code.lower(), "Vinted style should be casual"
        assert "hashtag" in code.lower(), "Vinted style should include hashtags"

    def test_ebay_style_is_professional_seo(self):
        code = read_lib("describe.ts")
        assert "professional" in code.lower() or "professionale" in code.lower()
        assert "SEO" in code

    def test_temperature_is_set(self):
        code = read_lib("describe.ts")
        assert "temperature: 0.7" in code

    def test_max_tokens_is_512(self):
        code = read_lib("describe.ts")
        assert "max_tokens: 512" in code

    def test_specifies_model(self):
        code = read_lib("describe.ts")
        assert "claude-sonnet-4" in code

    def test_different_prompts_per_marketplace(self):
        code = read_lib("describe.ts")
        # The PROMPTS record is keyed by marketplace
        assert "Record<Marketplace, Record<string, string>>" in code


# == 13. UNIT: Marketplace Fees ============================================


class TestMarketplaceFees:
    """Verify marketplace fee structure."""

    def test_fee_structure_defines_vinted(self):
        code = read_lib("marketplace-fees.ts")
        assert "vinted" in code

    def test_fee_structure_defines_ebay(self):
        code = read_lib("marketplace-fees.ts")
        assert "ebay" in code

    def test_vinted_fee_is_zero(self):
        code = read_lib("marketplace-fees.ts")
        assert "feePercent: 0" in code

    def test_ebay_fee_is_13_percent(self):
        code = read_lib("marketplace-fees.ts")
        assert "feePercent: 13" in code

    def test_get_platform_fee_function_exists(self):
        code = read_lib("marketplace-fees.ts")
        assert "export function getPlatformFee" in code

    def test_get_platform_fee_handles_null_marketplace(self):
        code = read_lib("marketplace-fees.ts")
        assert "Marketplace | null" in code
        assert "if (!marketplace) return 0" in code

    def test_fee_calculation_formula(self):
        code = read_lib("marketplace-fees.ts")
        assert "salePrice * fee.feePercent" in code or "(salePrice * fee.feePercent) / 100" in code
