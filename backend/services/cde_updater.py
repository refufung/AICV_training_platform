"""
CDE (Common Data Environment) updater — write defect data back into IFC
property sets so the model carries inspection metadata.

Uses ifcopenshell to add/update PropertySets on components that have defects.
"""
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def write_defects_to_ifc(
    ifc_path: str,
    defects: list,
    output_path: Optional[str] = None,
) -> str:
    """
    Open *ifc_path*, attach an ``AI_Inspection`` PropertySet to each component
    referenced by the supplied defects, and save to *output_path* (or overwrite
    in-place).

    Returns the path of the written file.
    """
    try:
        import ifcopenshell
        import ifcopenshell.api
    except ImportError:
        raise RuntimeError(
            "ifcopenshell is required for CDE write-back. "
            "Install via: pip install ifcopenshell"
        )

    model = ifcopenshell.open(ifc_path)
    owner_history = model.by_type("IfcOwnerHistory")[0] if model.by_type("IfcOwnerHistory") else None

    # Group defects by component global_id
    comp_defects: dict[str, list] = {}
    for d in defects:
        if d.component and d.component.global_id:
            gid = d.component.global_id
            comp_defects.setdefault(gid, []).append(d)

    updated = 0
    for global_id, defs in comp_defects.items():
        element = model.by_guid(global_id)
        if element is None:
            logger.warning("Element %s not found in IFC", global_id)
            continue

        # Build property values
        worst_severity = max(defs, key=lambda x: _sev_rank(x.severity.value)).severity.value
        defect_ids = ",".join(str(d.id) for d in defs)
        classes = ",".join(sorted({d.defect_class.value for d in defs}))

        props = {
            "InspectionDefectCount": len(defs),
            "InspectionWorstSeverity": worst_severity,
            "InspectionDefectIds": defect_ids,
            "InspectionDefectClasses": classes,
        }

        # Create or update property set
        pset = ifcopenshell.api.run(
            "pset.add_pset", model, product=element, name="AI_Inspection"
        )
        ifcopenshell.api.run(
            "pset.edit_pset", model, pset=pset, properties=props
        )
        updated += 1

    dest = output_path or ifc_path
    model.write(dest)
    logger.info("Wrote inspection data to %d elements in %s", updated, dest)
    return dest


def _sev_rank(s: str) -> int:
    return {"low": 0, "medium": 1, "high": 2, "critical": 3}.get(s, 0)
