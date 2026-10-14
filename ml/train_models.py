import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType, StringTensorType

# Create output models directory
models_dir = os.path.join(os.path.dirname(__file__), "..", "public", "models")
os.makedirs(models_dir, exist_ok=True)

print("=" * 60)
print("1. TRAINING LEAD SCORING MODEL (CALIBRATED FOR INR)")
print("=" * 60)

np.random.seed(42)
n_leads = 4000

sources = ['referral', 'inbound', 'cold_outreach', 'ad']
industries = ['tech', 'finance', 'healthcare', 'retail', 'education', 'services']

company_size = np.random.randint(2, 500, size=n_leads).astype(np.float32)
# Budget in Indian Rupees: ₹50,000 to ₹50,00,000 (50k to 50 Lakhs)
budget = np.random.uniform(50000, 5000000, size=n_leads).astype(np.float32)
interactions = np.random.randint(1, 25, size=n_leads).astype(np.float32)
has_nda = np.random.choice([0.0, 1.0], size=n_leads, p=[0.65, 0.35]).astype(np.float32)
decision_maker = np.random.choice([0.0, 1.0], size=n_leads, p=[0.45, 0.55]).astype(np.float32)
source_vals = np.random.choice(sources, size=n_leads, p=[0.25, 0.40, 0.20, 0.15])
industry_vals = np.random.choice(industries, size=n_leads)

# Realistic probability score in INR scale
conversion_logits = (
    0.0000005 * budget
    + 0.18 * interactions
    + 0.9 * has_nda
    + 1.1 * decision_maker
    + (source_vals == 'referral') * 1.4
    + (source_vals == 'inbound') * 0.7
    + (source_vals == 'cold_outreach') * -0.5
    + (industry_vals == 'tech') * 0.4
    + (industry_vals == 'finance') * 0.5
    - 2.8
)
conversion_prob = 1.0 / (1.0 + np.exp(-conversion_logits))
converted = (np.random.rand(n_leads) < conversion_prob).astype(int)

df_leads = pd.DataFrame({
    'company_size': company_size,
    'estimated_budget': budget,
    'interaction_count': interactions,
    'has_nda': has_nda,
    'decision_maker_involved': decision_maker,
    'source': source_vals,
    'industry': industry_vals,
    'converted': converted
})

numeric_lead_feats = ['company_size', 'estimated_budget', 'interaction_count', 'has_nda', 'decision_maker_involved']
categorical_lead_feats = ['source', 'industry']

lead_preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_lead_feats),
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_lead_feats)
    ]
)

lead_pipeline = Pipeline([
    ('preprocessor', lead_preprocessor),
    ('classifier', RandomForestClassifier(n_estimators=60, max_depth=7, random_state=42))
])

X_lead = df_leads.drop(columns=['converted'])
y_lead = df_leads['converted']
X_l_train, X_l_test, y_l_train, y_l_test = train_test_split(X_lead, y_lead, test_size=0.2, random_state=42)

lead_pipeline.fit(X_l_train, y_l_train)
lead_acc = lead_pipeline.score(X_l_test, y_l_test)
print(f"Lead Scoring Test Accuracy: {lead_acc * 100:.2f}%")

lead_initial_types = [
    ('company_size', FloatTensorType([None, 1])),
    ('estimated_budget', FloatTensorType([None, 1])),
    ('interaction_count', FloatTensorType([None, 1])),
    ('has_nda', FloatTensorType([None, 1])),
    ('decision_maker_involved', FloatTensorType([None, 1])),
    ('source', StringTensorType([None, 1])),
    ('industry', StringTensorType([None, 1]))
]

lead_onnx = convert_sklearn(
    lead_pipeline,
    initial_types=lead_initial_types,
    target_opset=12,
    options={id(lead_pipeline.named_steps['classifier']): {'zipmap': False}}
)

lead_onnx_path = os.path.join(models_dir, "lead_scoring_model.onnx")
with open(lead_onnx_path, "wb") as f:
    f.write(lead_onnx.SerializeToString())
print(f"Saved: {lead_onnx_path} ({os.path.getsize(lead_onnx_path) / 1024:.1f} KB)")


print("\n" + "=" * 60)
print("2. TRAINING PAYMENT DELAY PREDICTION MODEL (CALIBRATED FOR INR)")
print("=" * 60)

n_invoices = 3500
client_types = ['enterprise', 'startup', 'agency', 'individual']

# Invoice Amount in INR: ₹25,000 to ₹30,00,000 (25k to 30 Lakhs)
inv_amount = np.random.uniform(25000, 3000000, size=n_invoices).astype(np.float32)
payment_terms = np.random.choice([15.0, 30.0, 45.0, 60.0], size=n_invoices).astype(np.float32)
prior_late = np.random.poisson(lam=1.2, size=n_invoices).astype(np.float32)
days_until_due = np.random.uniform(-10.0, 30.0, size=n_invoices).astype(np.float32)
client_type_vals = np.random.choice(client_types, size=n_invoices, p=[0.3, 0.35, 0.25, 0.1])
disputed_items = np.random.choice([0.0, 1.0], size=n_invoices, p=[0.88, 0.12]).astype(np.float32)

late_days = (
    0.0000025 * inv_amount
    + 0.12 * payment_terms
    + 4.5 * prior_late
    + 14.0 * disputed_items
    + (client_type_vals == 'enterprise') * 5.0
    + (client_type_vals == 'startup') * 2.5
    + (client_type_vals == 'individual') * -1.0
    + np.random.normal(0, 3.0, size=n_invoices)
)
late_days = np.clip(late_days, 0.0, 90.0).astype(np.float32)

df_invoices = pd.DataFrame({
    'amount': inv_amount,
    'payment_term_days': payment_terms,
    'prior_late_payments': prior_late,
    'days_until_due': days_until_due,
    'disputed_items': disputed_items,
    'client_type': client_type_vals,
    'late_days': late_days
})

numeric_inv_feats = ['amount', 'payment_term_days', 'prior_late_payments', 'days_until_due', 'disputed_items']
categorical_inv_feats = ['client_type']

inv_preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_inv_feats),
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_inv_feats)
    ]
)

payment_pipeline = Pipeline([
    ('preprocessor', inv_preprocessor),
    ('regressor', RandomForestRegressor(n_estimators=50, max_depth=6, random_state=42))
])

X_inv = df_invoices.drop(columns=['late_days'])
y_inv = df_invoices['late_days']
X_i_train, X_i_test, y_i_train, y_i_test = train_test_split(X_inv, y_inv, test_size=0.2, random_state=42)

payment_pipeline.fit(X_i_train, y_i_train)
inv_r2 = payment_pipeline.score(X_i_test, y_i_test)
print(f"Payment Delay Predictor Test R^2: {inv_r2:.3f}")

inv_initial_types = [
    ('amount', FloatTensorType([None, 1])),
    ('payment_term_days', FloatTensorType([None, 1])),
    ('prior_late_payments', FloatTensorType([None, 1])),
    ('days_until_due', FloatTensorType([None, 1])),
    ('disputed_items', FloatTensorType([None, 1])),
    ('client_type', StringTensorType([None, 1]))
]

payment_onnx = convert_sklearn(
    payment_pipeline,
    initial_types=inv_initial_types,
    target_opset=12
)

payment_onnx_path = os.path.join(models_dir, "payment_prediction_model.onnx")
with open(payment_onnx_path, "wb") as f:
    f.write(payment_onnx.SerializeToString())
print(f"Saved: {payment_onnx_path} ({os.path.getsize(payment_onnx_path) / 1024:.1f} KB)")

print("\n" + "=" * 60)
print("SUCCESS: MODELS TRAINED & EXPORTED WITH INR VALUES!")
print("=" * 60)
